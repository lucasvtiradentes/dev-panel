import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  EMPTY_TASKS_MESSAGE,
  FILE_WATCHER_DEBOUNCE_MS,
  NO_PENDING_TASKS_MESSAGE,
  getCommandId,
} from '../../common/constants';
import { loadWorkspaceConfigFromPath } from '../../common/lib/config-manager';
import { StoreKey, extensionStore } from '../../common/lib/extension-store';
import { logger } from '../../common/lib/logger';
import { Command, ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import type { DevPanelConfig } from '../../common/schemas/config-schema';
import { getFirstWorkspacePath } from '../../common/utils/workspace-utils';
import { loadBranchContextFromFile } from '../branch-context/file-storage';
import { getBranchContextFilePath } from '../branch-context/markdown-parser';
import {
  type MilestoneNode,
  type SyncContext,
  type TaskNode,
  type TaskPriority,
  type TaskStatus,
  type TaskSyncProvider,
  createTaskProvider,
} from '../branch-context/providers';
import { type TaskFilter, applyFilters, filterTodoNodes, flattenNodes } from './filter-operations';
import {
  BranchMilestoneItem,
  BranchTaskItem,
  BranchTasksDragAndDropController,
  type BranchTreeItem,
  NO_MILESTONE_NAME,
} from './task-tree-items';

export { BranchMilestoneItem, BranchTaskItem, BranchTasksDragAndDropController, NO_MILESTONE_NAME };

export class BranchTasksProvider implements vscode.TreeDataProvider<BranchTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<BranchTreeItem | undefined>();
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
    return loadWorkspaceConfigFromPath(workspace);
  }

  toggleShowOnlyTodo(): void {
    this.showOnlyTodo = !this.showOnlyTodo;
    void setContextKey(ContextKey.BranchTasksShowOnlyTodo, this.showOnlyTodo);
    this.refresh();
  }

  toggleGroupMode(): void {
    this.grouped = !this.grouped;
    void setContextKey(ContextKey.BranchTasksGrouped, this.grouped);
    this.refresh();
  }

  async addRootTask(text: string): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onCreateTask({ text }, undefined, syncContext);
    this.refresh();
  }

  async syncTasks(): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    try {
      const result = await this.taskProvider.onSync(syncContext);
      if (result.added > 0 || result.updated > 0 || result.deleted > 0) {
        vscode.window.showInformationMessage(
          `Synced: ${result.added} added, ${result.updated} updated, ${result.deleted} deleted`,
        );
      } else {
        vscode.window.showInformationMessage('Tasks are up to date');
      }
      this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Sync failed: ${error}`);
    }
  }

  async showFilterQuickPick(): Promise<void> {
    const items: vscode.QuickPickItem[] = [
      { label: '$(circle-large-outline) Todo only', description: 'Show only todo tasks' },
      { label: '$(play-circle) Doing only', description: 'Show only in-progress tasks' },
      { label: '$(error) Blocked only', description: 'Show only blocked tasks' },
      { label: '$(warning) Overdue only', description: 'Show only overdue tasks' },
      { label: '$(account) By assignee...', description: 'Filter by assignee name' },
      { label: '$(flame) High priority+', description: 'Show urgent and high priority' },
      { label: '$(link-external) With external link', description: 'Show only linked tasks' },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      { label: '$(close) Clear filters', description: 'Show all tasks' },
    ];

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select filter',
    });

    if (!picked) return;

    switch (picked.label) {
      case '$(circle-large-outline) Todo only':
        this.activeFilters = { status: ['todo'] };
        break;
      case '$(play-circle) Doing only':
        this.activeFilters = { status: ['doing'] };
        break;
      case '$(error) Blocked only':
        this.activeFilters = { status: ['blocked'] };
        break;
      case '$(warning) Overdue only':
        this.activeFilters = { overdue: true };
        break;
      case '$(account) By assignee...': {
        const assignee = await vscode.window.showInputBox({
          prompt: 'Enter assignee name',
          placeHolder: 'e.g., lucas',
        });
        if (assignee) {
          this.activeFilters = { assignee };
        }
        break;
      }
      case '$(flame) High priority+':
        this.activeFilters = { priority: ['urgent', 'high'] };
        break;
      case '$(link-external) With external link':
        this.activeFilters = { hasExternalLink: true };
        break;
      case '$(close) Clear filters':
        this.activeFilters = {};
        break;
    }

    void setContextKey(ContextKey.BranchTasksHasFilter, Object.keys(this.activeFilters).length > 0);
    this.refresh();
  }

  handleMarkdownChange(uri: vscode.Uri): void {
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

  setBranch(branchName: string): void {
    if (branchName !== this.currentBranch) {
      logger.info(`[BranchTasksProvider] Branch changed from '${this.currentBranch}' to '${branchName}'`);
      this.currentBranch = branchName;
      this.refresh();
    }
  }

  private loadBranchTasks(): void {
    const filePath = getBranchContextFilePath(this.currentBranch);

    if (!filePath || !fs.existsSync(filePath)) {
      this.cachedNodes = [];
      this.cachedOrphanTasks = [];
      this.cachedMilestones = [];
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) {
      this.cachedNodes = [];
      this.cachedOrphanTasks = [];
      this.cachedMilestones = [];
      return;
    }

    const branchContext = loadBranchContextFromFile(workspace, this.currentBranch);

    const syncContext: SyncContext = {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath: filePath,
      branchContext,
    };

    this.taskProvider.getTasks(syncContext).then((nodes) => {
      this.cachedNodes = nodes;
    });

    this.taskProvider.getMilestones(syncContext).then(({ orphanTasks, milestones }) => {
      this.cachedOrphanTasks = orphanTasks;
      this.cachedMilestones = milestones;
    });
  }

  refresh(): void {
    logger.info(`[BranchTasksProvider] Refreshing tasks for branch: ${this.currentBranch}`);
    this.loadBranchTasks();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: BranchTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: BranchTreeItem): Promise<BranchTreeItem[]> {
    if (element instanceof BranchMilestoneItem) {
      let tasks = filterTodoNodes(element.milestone.tasks, this.showOnlyTodo);
      tasks = applyFilters(tasks, this.activeFilters);
      if (!this.grouped) {
        tasks = flattenNodes(tasks);
      }
      return tasks.map((node) => new BranchTaskItem(node, node.children.length > 0));
    }

    if (element instanceof BranchTaskItem) {
      return element.node.children.map((child) => new BranchTaskItem(child, child.children.length > 0));
    }

    this.loadBranchTasks();

    if (!this.currentBranch) {
      return [];
    }

    const hasMilestones = this.cachedMilestones.length > 0;

    if (hasMilestones) {
      const result: BranchTreeItem[] = [];

      let orphanTasks = filterTodoNodes(this.cachedOrphanTasks, this.showOnlyTodo);
      orphanTasks = applyFilters(orphanTasks, this.activeFilters);
      if (!this.grouped) {
        orphanTasks = flattenNodes(orphanTasks);
      }

      if (orphanTasks.length > 0) {
        const noMilestoneNode: MilestoneNode = {
          name: NO_MILESTONE_NAME,
          lineIndex: -1,
          tasks: orphanTasks,
        };
        result.push(new BranchMilestoneItem(noMilestoneNode, true));
      }

      for (const milestone of this.cachedMilestones) {
        let tasks = filterTodoNodes(milestone.tasks, this.showOnlyTodo);
        tasks = applyFilters(tasks, this.activeFilters);
        if (tasks.length > 0 || !this.showOnlyTodo) {
          result.push(new BranchMilestoneItem({ ...milestone, tasks }));
        }
      }

      const hasActiveFilter = Object.keys(this.activeFilters).length > 0;
      if (result.length === 0) {
        const message = this.showOnlyTodo || hasActiveFilter ? NO_PENDING_TASKS_MESSAGE : EMPTY_TASKS_MESSAGE;
        const openFileItem = new vscode.TreeItem(message);
        openFileItem.command = {
          command: getCommandId(Command.OpenBranchContextFile),
          title: 'Open Branch Context File',
        };
        return [openFileItem as unknown as BranchTreeItem];
      }

      return result;
    }

    let processedNodes = filterTodoNodes(this.cachedNodes, this.showOnlyTodo);
    processedNodes = applyFilters(processedNodes, this.activeFilters);

    if (!this.grouped) {
      processedNodes = flattenNodes(processedNodes);
    }

    const hasActiveFilter = Object.keys(this.activeFilters).length > 0;
    if (processedNodes.length === 0) {
      const message = this.showOnlyTodo || hasActiveFilter ? NO_PENDING_TASKS_MESSAGE : EMPTY_TASKS_MESSAGE;
      const openFileItem = new vscode.TreeItem(message);
      openFileItem.command = {
        command: getCommandId(Command.OpenBranchContextFile),
        title: 'Open Branch Context File',
      };
      return [openFileItem as unknown as BranchTreeItem];
    }

    return processedNodes.map((node) => new BranchTaskItem(node, node.children.length > 0));
  }

  toggleTodo(lineIndex: number): void {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    const task = this.findNodeByLineIndex(lineIndex);
    if (!task) return;

    const newStatus = this.taskProvider.cycleStatus(task.status);

    this.taskProvider.onStatusChange(lineIndex, newStatus, syncContext).then(() => {
      this.refresh();
    });
  }

  async setStatus(lineIndex: number, status: TaskStatus): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onStatusChange(lineIndex, status, syncContext);
    this.refresh();
  }

  async setPriority(lineIndex: number, priority: TaskPriority): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onUpdateMeta(lineIndex, { priority }, syncContext);
    this.refresh();
  }

  async setAssignee(lineIndex: number, assignee: string | undefined): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onUpdateMeta(lineIndex, { assignee }, syncContext);
    this.refresh();
  }

  async setDueDate(lineIndex: number, dueDate: string | undefined): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onUpdateMeta(lineIndex, { dueDate }, syncContext);
    this.refresh();
  }

  async addSubtask(parentLineIndex: number, text: string): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onCreateTask({ text }, parentLineIndex, syncContext);
    this.refresh();
  }

  async editTaskText(lineIndex: number, text: string): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.onEditText(lineIndex, text, syncContext);
    this.refresh();
  }

  async deleteTask(lineIndex: number): Promise<void> {
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
    if (!filePath || !fs.existsSync(filePath)) return null;

    const workspace = getFirstWorkspacePath();
    if (!workspace) return null;

    const branchContext = loadBranchContextFromFile(workspace, this.currentBranch);

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

  async moveTaskToMilestone(lineIndex: number, milestoneName: string | null): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.moveTaskToMilestone(lineIndex, milestoneName, syncContext);
    this.refresh();
  }

  async createMilestone(name: string): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    await this.taskProvider.createMilestone(name, syncContext);
    this.refresh();
  }

  async reorderTask(taskLineIndex: number, targetLineIndex: number): Promise<void> {
    const syncContext = this.getSyncContext();
    if (!syncContext) return;

    const position = taskLineIndex < targetLineIndex ? 'after' : 'before';
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

  dispose(): void {
    if (this.fileChangeDebounce) {
      clearTimeout(this.fileChangeDebounce);
    }
  }
}
