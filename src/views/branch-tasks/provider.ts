import { FILE_WATCHER_DEBOUNCE_MS } from '../../common/constants';
import { Position } from '../../common/constants/enums';
import { ConfigManager } from '../../common/lib/config-manager';
import { StoreKey, extensionStore } from '../../common/lib/extension-store';
import { logger } from '../../common/lib/logger';
import { FileIOHelper } from '../../common/lib/node-helper';
import type { TaskPriority, TaskStatus } from '../../common/schemas';
import type { DevPanelConfig } from '../../common/schemas/config-schema';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import type { TreeDataProvider, TreeItem, Uri } from '../../common/vscode/vscode-types';
import { ContextKey, setContextKey } from '../../common/vscode/vscode-utils';
import { getFirstWorkspacePath } from '../../common/vscode/workspace-utils';
import {
  type MilestoneNode,
  type SyncContext,
  type TaskNode,
  type TaskSyncProvider,
  createTaskProvider,
  getBranchContextFilePath,
  loadBranchContext,
} from '../_branch_base';
import type { TaskFilter } from './filter-operations';
import { showFilterQuickPick as showFilterQuickPickDialog } from './filter-quick-pick';
import { buildFlatTree, buildMilestoneChildren, buildMilestonesTree, buildTaskChildren } from './provider-tree-builder';
import {
  BranchMilestoneItem,
  BranchTaskItem,
  BranchTasksDragAndDropController,
  type BranchTreeItem,
} from './task-tree-items';

export class BranchTasksProvider implements TreeDataProvider<BranchTreeItem> {
  private _onDidChangeTreeData = VscodeHelper.createEventEmitter<BranchTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentBranch = '';
  private cachedNodes: TaskNode[] = [];
  private cachedOrphanTasks: TaskNode[] = [];
  private cachedMilestones: MilestoneNode[] = [];
  private showOnlyTodo = false;
  private grouped = true;
  private activeFilters: TaskFilter = {};
  private taskProvider: TaskSyncProvider;
  private fileChangeDebounce: NodeJS.Timeout | null = null;
  private isInitializing = true;

  constructor() {
    const workspace = getFirstWorkspacePath();
    const config = workspace ? this.loadConfig(workspace) : null;
    const tasksConfig = config?.branchContext?.builtinSections?.tasks;
    this.taskProvider = createTaskProvider(tasksConfig, workspace ?? undefined);
    void setContextKey(ContextKey.BranchTasksHasFilter, false);
    const hasExternalProvider = typeof tasksConfig === 'object' && 'provider' in tasksConfig;
    void setContextKey(ContextKey.BranchTasksHasExternalProvider, hasExternalProvider);
  }

  private loadConfig(workspace: string): DevPanelConfig | null {
    return ConfigManager.loadWorkspaceConfigFromPath(workspace);
  }

  toggleShowOnlyTodo() {
    this.showOnlyTodo = !this.showOnlyTodo;
    void setContextKey(ContextKey.BranchTasksShowOnlyTodo, this.showOnlyTodo);
    this.refresh();
  }

  toggleGroupMode() {
    this.grouped = !this.grouped;
    void setContextKey(ContextKey.BranchTasksGrouped, this.grouped);
    this.refresh();
  }

  async addRootTask(text: string) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onCreateTask({ text }, undefined, syncContext);
    this.refresh();
  }

  async syncTasks() {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    try {
      const result = await this.taskProvider.onSync(syncContext);
      if (result.added > 0 || result.updated > 0 || result.deleted > 0) {
        VscodeHelper.showToastMessage(
          ToastKind.Info,
          `Synced: ${result.added} added, ${result.updated} updated, ${result.deleted} deleted`,
        );
      } else {
        VscodeHelper.showToastMessage(ToastKind.Info, 'Tasks are up to date');
      }
      this.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      VscodeHelper.showToastMessage(ToastKind.Error, `Sync failed: ${message}`);
    }
  }

  async showFilterQuickPick() {
    const filter = await showFilterQuickPickDialog();
    if (filter === null) return;

    this.activeFilters = filter;
    void setContextKey(ContextKey.BranchTasksHasFilter, Object.keys(this.activeFilters).length > 0);
    this.refresh();
  }

  handleMarkdownChange(uri: Uri) {
    if (extensionStore.get(StoreKey.IsWritingBranchContext)) {
      logger.info(`[BranchTasksProvider] Ignoring file change during sync: ${uri.fsPath}`);
      return;
    }

    logger.info(`[BranchTasksProvider] File changed: ${uri.fsPath}, currentBranch: ${this.currentBranch}`);

    if (this.fileChangeDebounce) {
      clearTimeout(this.fileChangeDebounce);
    }

    this.fileChangeDebounce = setTimeout(() => {
      this.refresh();
      this.fileChangeDebounce = null;
    }, FILE_WATCHER_DEBOUNCE_MS);
  }

  setBranch(branchName: string) {
    if (branchName !== this.currentBranch) {
      logger.info(
        `[BranchTasksProvider] [setBranch] Branch changed from '${this.currentBranch}' to '${branchName}' (isInitializing: ${this.isInitializing})`,
      );
      this.currentBranch = branchName;
      const wasInitializing = this.isInitializing;
      this.isInitializing = false;
      if (!wasInitializing) {
        logger.info('[BranchTasksProvider] [setBranch] NOT initializing, calling refresh immediately');
        this.refresh();
      } else {
        logger.info(
          '[BranchTasksProvider] [setBranch] IS initializing, skipping immediate refresh - waiting for onSyncComplete',
        );
      }
    } else {
      logger.info(`[BranchTasksProvider] [setBranch] Branch unchanged: ${branchName}`);
      this.isInitializing = false;
    }
  }

  private async loadBranchTasks() {
    const loadStartTime = Date.now();
    const filePath = getBranchContextFilePath(this.currentBranch);
    logger.info(`[BranchTasksProvider] [loadBranchTasks] START - Branch: ${this.currentBranch}, FilePath: ${filePath}`);

    if (!filePath || !FileIOHelper.fileExists(filePath)) {
      logger.warn(
        `[BranchTasksProvider] [loadBranchTasks] File not found, clearing cache. filePath: ${filePath}, exists: ${filePath ? FileIOHelper.fileExists(filePath) : 'N/A'}`,
      );
      this.cachedNodes = [];
      this.cachedOrphanTasks = [];
      this.cachedMilestones = [];
      logger.info('[BranchTasksProvider] [loadBranchTasks] END - Cache cleared (no file)');
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) {
      logger.warn('[BranchTasksProvider] [loadBranchTasks] No workspace, clearing cache');
      this.cachedNodes = [];
      this.cachedOrphanTasks = [];
      this.cachedMilestones = [];
      logger.info('[BranchTasksProvider] [loadBranchTasks] END - Cache cleared (no workspace)');
      return;
    }

    const branchContext = loadBranchContext(this.currentBranch);
    logger.info(
      `[BranchTasksProvider] [loadBranchTasks] Loaded branchContext, todos section length: ${branchContext.todos?.length ?? 0} (+${Date.now() - loadStartTime}ms)`,
    );

    const syncContext: SyncContext = {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath: filePath,
      branchContext,
    };

    logger.info(
      `[BranchTasksProvider] [loadBranchTasks] Fetching tasks and milestones in PARALLEL (+${Date.now() - loadStartTime}ms)`,
    );

    const [nodes, { orphanTasks, milestones }] = await Promise.all([
      this.taskProvider.getTasks(syncContext),
      this.taskProvider.getMilestones(syncContext),
    ]);

    logger.info(
      `[BranchTasksProvider] [loadBranchTasks] Promises resolved - ${nodes.length} nodes, ${milestones.length} milestones, ${orphanTasks.length} orphan tasks (+${Date.now() - loadStartTime}ms)`,
    );

    this.cachedNodes = nodes;
    this.cachedOrphanTasks = orphanTasks;
    this.cachedMilestones = milestones;

    logger.info(
      `[BranchTasksProvider] [loadBranchTasks] END - Cache updated successfully (${Date.now() - loadStartTime}ms total)`,
    );
  }

  refresh() {
    logger.info(
      `[BranchTasksProvider] [refresh] CALLED - Branch: ${this.currentBranch}, isInitializing: ${this.isInitializing}`,
    );
    void this.loadBranchTasks().then(() => {
      logger.info('[BranchTasksProvider] [refresh] Tasks loaded, firing tree data change event');
      this._onDidChangeTreeData.fire(undefined);
    });
  }

  getTreeItem(element: BranchTreeItem): TreeItem {
    return element;
  }

  async getChildren(element?: BranchTreeItem): Promise<BranchTreeItem[]> {
    if (element instanceof BranchMilestoneItem) {
      logger.info(`[BranchTasksProvider] [getChildren] Returning milestone children for: ${element.milestone.name}`);
      return buildMilestoneChildren(element.milestone, this.showOnlyTodo, this.activeFilters, this.grouped);
    }

    if (element instanceof BranchTaskItem) {
      logger.info(`[BranchTasksProvider] [getChildren] Returning task children for line: ${element.node.lineIndex}`);
      return buildTaskChildren(element.node);
    }

    logger.info(
      `[BranchTasksProvider] [getChildren] ROOT CALL - Branch: ${this.currentBranch}, using CACHED data (nodes: ${this.cachedNodes.length}, milestones: ${this.cachedMilestones.length}, orphans: ${this.cachedOrphanTasks.length})`,
    );

    if (!this.currentBranch) {
      logger.warn('[BranchTasksProvider] [getChildren] No current branch, returning empty array');
      return [];
    }

    const hasMilestones = this.cachedMilestones.length > 0;

    if (hasMilestones) {
      const result = buildMilestonesTree({
        orphanTasks: this.cachedOrphanTasks,
        milestones: this.cachedMilestones,
        showOnlyTodo: this.showOnlyTodo,
        activeFilters: this.activeFilters,
        grouped: this.grouped,
      });

      if (result.length === 0) {
        logger.info(
          '[BranchTasksProvider] [getChildren] Milestones tree is empty, returning empty array (viewsWelcome will show)',
        );
        return [];
      }

      logger.info(`[BranchTasksProvider] [getChildren] Returning ${result.length} milestone items from cache`);
      return result;
    }

    const result = buildFlatTree(this.cachedNodes, this.showOnlyTodo, this.activeFilters, this.grouped);

    if (result.length === 0) {
      logger.info(
        '[BranchTasksProvider] [getChildren] Flat tree is empty, returning empty array (viewsWelcome will show)',
      );
      return [];
    }

    logger.info(`[BranchTasksProvider] [getChildren] Returning ${result.length} task items from cache`);
    return result;
  }

  toggleTodo(lineIndex: number) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    const task = this.findNodeByLineIndex(lineIndex);
    if (!task) return;

    const newStatus = this.taskProvider.cycleStatus(task.status);

    this.taskProvider.onStatusChange(lineIndex, newStatus, syncContext).then(() => {
      this.refresh();
    });
  }

  async setStatus(lineIndex: number, status: TaskStatus) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onStatusChange(lineIndex, status, syncContext);
    this.refresh();
  }

  async setPriority(lineIndex: number, priority: TaskPriority) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onUpdateMeta(lineIndex, { priority }, syncContext);
    this.refresh();
  }

  async setAssignee(lineIndex: number, assignee: string | undefined) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onUpdateMeta(lineIndex, { assignee }, syncContext);
    this.refresh();
  }

  async setDueDate(lineIndex: number, dueDate: string | undefined) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onUpdateMeta(lineIndex, { dueDate }, syncContext);
    this.refresh();
  }

  async addSubtask(parentLineIndex: number, text: string) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onCreateTask({ text }, parentLineIndex, syncContext);
    this.refresh();
  }

  async editTaskText(lineIndex: number, text: string) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onEditText(lineIndex, text, syncContext);
    this.refresh();
  }

  async deleteTask(lineIndex: number) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onDeleteTask(lineIndex, syncContext);
    this.refresh();
  }

  findNodeByLineIndex(lineIndex: number): TaskNode | null {
    const findInNodes = (nodes: TaskNode[]): TaskNode | null => {
      for (const node of nodes) {
        if (node.lineIndex === lineIndex) return node;
        const found = findInNodes(node.children);
        if (found) return found;
      }
      return null;
    };
    return findInNodes(this.cachedNodes);
  }

  private getSyncContext(): SyncContext | null {
    const filePath = getBranchContextFilePath(this.currentBranch);
    if (!filePath || !FileIOHelper.fileExists(filePath)) return null;

    const workspace = getFirstWorkspacePath();
    if (!workspace) return null;

    const branchContext = loadBranchContext(this.currentBranch);

    return {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath: filePath,
      branchContext,
    };
  }

  getMilestoneNames(): string[] {
    return this.cachedMilestones.map((m) => m.name);
  }

  async moveTaskToMilestone(lineIndex: number, milestoneName: string | null) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.moveTaskToMilestone(lineIndex, milestoneName, syncContext);
    this.refresh();
  }

  async createMilestone(name: string) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.createMilestone(name, syncContext);
    this.refresh();
  }

  async reorderTask(taskLineIndex: number, targetLineIndex: number) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    const position = taskLineIndex < targetLineIndex ? Position.After : Position.Before;
    await this.taskProvider.reorderTask(taskLineIndex, targetLineIndex, position, syncContext);
    this.refresh();
  }

  findMilestoneForTask(lineIndex: number): string | undefined {
    for (const milestone of this.cachedMilestones) {
      const found = this.findTaskInNodes(milestone.tasks, lineIndex);
      if (found) return milestone.name;
    }

    const foundInOrphan = this.findTaskInNodes(this.cachedOrphanTasks, lineIndex);
    if (foundInOrphan) return undefined;

    return undefined;
  }

  private findTaskInNodes(nodes: TaskNode[], lineIndex: number): boolean {
    for (const node of nodes) {
      if (node.lineIndex === lineIndex) return true;
      if (this.findTaskInNodes(node.children, lineIndex)) return true;
    }
    return false;
  }

  get dragAndDropController(): BranchTasksDragAndDropController {
    return new BranchTasksDragAndDropController(this);
  }

  dispose() {
    if (this.fileChangeDebounce) {
      clearTimeout(this.fileChangeDebounce);
    }
  }
}
