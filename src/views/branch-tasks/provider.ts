import { BASE_BRANCH, BRANCH_CONTEXT_NA, FILE_WATCHER_DEBOUNCE_MS } from '../../common/constants';
import { Position } from '../../common/constants/enums';
import { StoreKey, extensionStore } from '../../common/core/extension-store';
import { logger } from '../../common/lib/logger';
import type { TaskPriority, TaskStatus } from '../../common/schemas';
import { FileIOHelper } from '../../common/utils/helpers/node-helper';
import { ContextKey, setContextKey } from '../../common/vscode/vscode-context';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { TreeDataProvider, TreeItem, TreeView, Uri } from '../../common/vscode/vscode-types';
import {
  type MilestoneNode,
  type SyncContext,
  type TaskNode,
  type TaskSyncProvider,
  getBranchContextFilePath,
  loadBranchContext,
} from '../_branch_base';
import { DefaultTaskProvider } from '../_branch_base/providers/default/tasks.provider';
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
  private treeView: TreeView<BranchTreeItem> | null = null;
  private lastManualRefreshTime = 0;

  constructor() {
    this.taskProvider = new DefaultTaskProvider();
    void setContextKey(ContextKey.BranchTasksHasFilter, false);
  }

  setTreeView(treeView: TreeView<BranchTreeItem>) {
    this.treeView = treeView;
    this.updateDescription();
  }

  private updateDescription() {
    if (!this.treeView) return;

    const allTasks = this.getAllTasksFlat();
    if (allTasks.length === 0) {
      this.treeView.description = undefined;
      return;
    }

    const completed = allTasks.filter((t) => t.status === 'done').length;
    this.treeView.description = `${completed}/${allTasks.length}`;
  }

  private getAllTasksFlat(): TaskNode[] {
    const tasks: TaskNode[] = [];
    const collectTasks = (nodes: TaskNode[]) => {
      for (const node of nodes) {
        tasks.push(node);
        collectTasks(node.children);
      }
    };

    if (this.cachedMilestones.length > 0) {
      for (const milestone of this.cachedMilestones) {
        collectTasks(milestone.tasks);
      }
      collectTasks(this.cachedOrphanTasks);
    } else {
      collectTasks(this.cachedNodes);
    }

    return tasks;
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

    const timeSinceManualRefresh = Date.now() - this.lastManualRefreshTime;
    if (timeSinceManualRefresh < FILE_WATCHER_DEBOUNCE_MS * 2) {
      logger.info(`[BranchTasksProvider] Ignoring file change - manual refresh was ${timeSinceManualRefresh}ms ago`);
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
        `[BranchTasksProvider] [loadBranchTasks] File not found, clearing cache. filePath: ${filePath}, exists: ${filePath ? FileIOHelper.fileExists(filePath) : BRANCH_CONTEXT_NA}`,
      );
      this.cachedNodes = [];
      this.cachedOrphanTasks = [];
      this.cachedMilestones = [];
      logger.info('[BranchTasksProvider] [loadBranchTasks] END - Cache cleared (no file)');
      return;
    }

    const workspace = VscodeHelper.getFirstWorkspacePath();
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
      comparisonBranch: BASE_BRANCH,
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
      this.updateDescription();
    });
  }

  private refreshAfterTaskOperation() {
    this.lastManualRefreshTime = Date.now();
    this.refresh();
  }

  shouldSkipRefresh(): boolean {
    const timeSinceManualRefresh = Date.now() - this.lastManualRefreshTime;
    return timeSinceManualRefresh < FILE_WATCHER_DEBOUNCE_MS * 2;
  }

  refreshIfNeeded() {
    if (!this.shouldSkipRefresh()) {
      this.lastManualRefreshTime = Date.now();
      this.refresh();
    }
  }

  getTreeItem(element: BranchTreeItem): TreeItem {
    return element;
  }

  async getChildren(element?: BranchTreeItem): Promise<BranchTreeItem[]> {
    if (element instanceof BranchMilestoneItem) {
      return buildMilestoneChildren(element.milestone, this.showOnlyTodo, this.activeFilters, this.grouped);
    }

    if (element instanceof BranchTaskItem) {
      return buildTaskChildren(element.node);
    }

    if (!this.currentBranch) {
      return [];
    }

    const hasMilestones = this.cachedMilestones.length > 0;

    if (hasMilestones) {
      return buildMilestonesTree({
        orphanTasks: this.cachedOrphanTasks,
        milestones: this.cachedMilestones,
        showOnlyTodo: this.showOnlyTodo,
        activeFilters: this.activeFilters,
        grouped: this.grouped,
      });
    }

    return buildFlatTree(this.cachedNodes, this.showOnlyTodo, this.activeFilters, this.grouped);
  }

  toggleTodo(lineIndex: number) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    const task = this.findNodeByLineIndex(lineIndex);
    if (!task) return;

    const newStatus = this.taskProvider.cycleStatus(task.status);
    this.lastManualRefreshTime = Date.now();

    this.taskProvider.onStatusChange(lineIndex, newStatus, syncContext).then(() => {
      this.refreshAfterTaskOperation();
    });
  }

  async setStatus(lineIndex: number, status: TaskStatus) {
    logger.info(`[BranchTasksProvider] [setStatus] START - lineIndex=${lineIndex}, status=${status}`);
    const syncContext = this.getSyncContext();
    if (!syncContext) {
      logger.warn('[BranchTasksProvider] [setStatus] No sync context, aborting');
      return;
    }

    this.lastManualRefreshTime = Date.now();
    logger.info('[BranchTasksProvider] [setStatus] Calling taskProvider.onStatusChange...');
    await this.taskProvider.onStatusChange(lineIndex, status, syncContext);
    logger.info('[BranchTasksProvider] [setStatus] onStatusChange complete, calling refresh...');
    this.refreshAfterTaskOperation();
    logger.info('[BranchTasksProvider] [setStatus] END');
  }

  async setPriority(lineIndex: number, priority: TaskPriority) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    this.lastManualRefreshTime = Date.now();
    await this.taskProvider.onUpdateMeta(lineIndex, { priority }, syncContext);
    this.refreshAfterTaskOperation();
  }

  async setAssignee(lineIndex: number, assignee: string | undefined) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    this.lastManualRefreshTime = Date.now();
    await this.taskProvider.onUpdateMeta(lineIndex, { assignee }, syncContext);
    this.refreshAfterTaskOperation();
  }

  async setDueDate(lineIndex: number, dueDate: string | undefined) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    this.lastManualRefreshTime = Date.now();
    await this.taskProvider.onUpdateMeta(lineIndex, { dueDate }, syncContext);
    this.refreshAfterTaskOperation();
  }

  async addSubtask(parentLineIndex: number, text: string) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    this.lastManualRefreshTime = Date.now();
    await this.taskProvider.onCreateTask({ text }, parentLineIndex, syncContext);
    this.refreshAfterTaskOperation();
  }

  async editTaskText(lineIndex: number, text: string) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    this.lastManualRefreshTime = Date.now();
    await this.taskProvider.onEditText(lineIndex, text, syncContext);
    this.refreshAfterTaskOperation();
  }

  async deleteTask(lineIndex: number) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    this.lastManualRefreshTime = Date.now();
    await this.taskProvider.onDeleteTask(lineIndex, syncContext);
    this.refreshAfterTaskOperation();
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

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return null;

    const branchContext = loadBranchContext(this.currentBranch);

    return {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath: filePath,
      branchContext,
      comparisonBranch: BASE_BRANCH,
    };
  }

  getMilestoneNames(): string[] {
    return this.cachedMilestones.map((m) => m.name);
  }

  async moveTaskToMilestone(lineIndex: number, milestoneName: string | null) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    this.lastManualRefreshTime = Date.now();
    await this.taskProvider.moveTaskToMilestone(lineIndex, milestoneName, syncContext);
    this.refreshAfterTaskOperation();
  }

  async createMilestone(name: string) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    this.lastManualRefreshTime = Date.now();
    await this.taskProvider.createMilestone(name, syncContext);
    this.refreshAfterTaskOperation();
  }

  async reorderTask(taskLineIndex: number, targetLineIndex: number) {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    this.lastManualRefreshTime = Date.now();
    const position = taskLineIndex < targetLineIndex ? Position.After : Position.Before;
    await this.taskProvider.reorderTask(taskLineIndex, targetLineIndex, position, syncContext);
    this.refreshAfterTaskOperation();
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
