import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  CONTEXT_VALUES,
  DND_MIME_TYPE_BRANCH_TASKS,
  EMPTY_TASKS_MESSAGE,
  FILE_WATCHER_DEBOUNCE_MS,
  NO_PENDING_TASKS_MESSAGE,
  getCommandId,
} from '../../common/constants';
import { loadWorkspaceConfigFromPath } from '../../common/lib/config-manager';
import { StoreKey, extensionStore } from '../../common/lib/extension-store';
import { logger } from '../../common/lib/logger';
import { Command, ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas/config-schema';
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
import { formatTaskDescription, formatTaskTooltip, getStatusIcon } from './task-item-utils';

type TaskFilter = {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee?: string;
  hasExternalLink?: boolean;
  overdue?: boolean;
};

export class BranchTaskItem extends vscode.TreeItem {
  constructor(
    public readonly node: TaskNode,
    hasChildren: boolean,
  ) {
    const label = node.text;
    super(label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);

    if (node.meta.externalUrl || node.meta.externalId) {
      this.contextValue = CONTEXT_VALUES.TODO_ITEM_WITH_EXTERNAL;
    } else {
      this.contextValue = CONTEXT_VALUES.TODO_ITEM;
    }
    this.description = formatTaskDescription(node.meta, node.status);
    this.tooltip = formatTaskTooltip(node.text, node.status, node.meta);

    this.iconPath = getStatusIcon(node.status, node.meta);
    this.command = {
      command: getCommandId(Command.CycleTaskStatus),
      title: 'Cycle Status',
      arguments: [node.lineIndex],
    };
  }
}

export const NO_MILESTONE_NAME = 'No Milestone';

type DragData = {
  type: 'task' | 'milestone';
  lineIndex: number;
  milestoneName?: string;
};

export class BranchTasksDragAndDropController implements vscode.TreeDragAndDropController<BranchTreeItem> {
  readonly dropMimeTypes = [DND_MIME_TYPE_BRANCH_TASKS];
  readonly dragMimeTypes = [DND_MIME_TYPE_BRANCH_TASKS];

  constructor(private readonly provider: BranchTasksProvider) {}

  handleDrag(
    source: readonly BranchTreeItem[],
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    const item = source[0];
    if (!item || !(item instanceof BranchTaskItem)) return;

    const data: DragData = {
      type: 'task',
      lineIndex: item.node.lineIndex,
      milestoneName: this.provider.findMilestoneForTask(item.node.lineIndex),
    };
    dataTransfer.set(DND_MIME_TYPE_BRANCH_TASKS, new vscode.DataTransferItem(JSON.stringify(data)));
  }

  async handleDrop(
    target: BranchTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const transferItem = dataTransfer.get(DND_MIME_TYPE_BRANCH_TASKS);
    if (!transferItem || !target) return;

    const dragData = JSON.parse(transferItem.value as string) as DragData;
    if (dragData.type !== 'task') return;

    if (target instanceof BranchMilestoneItem) {
      const targetMilestone = target.isNoMilestone ? null : target.milestone.name;
      if (dragData.milestoneName !== targetMilestone) {
        await this.provider.moveTaskToMilestone(dragData.lineIndex, targetMilestone);
      }
    } else if (target instanceof BranchTaskItem) {
      const targetMilestone = this.provider.findMilestoneForTask(target.node.lineIndex);

      if (dragData.milestoneName !== targetMilestone) {
        await this.provider.moveTaskToMilestone(dragData.lineIndex, targetMilestone ?? null);
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.provider.refresh();
      } else {
        await this.provider.reorderTask(dragData.lineIndex, target.node.lineIndex);
      }
    }
  }
}

export class BranchMilestoneItem extends vscode.TreeItem {
  constructor(
    public readonly milestone: MilestoneNode,
    public readonly isNoMilestone = false,
  ) {
    super(milestone.name, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.MILESTONE_ITEM;
    this.iconPath = new vscode.ThemeIcon(isNoMilestone ? 'inbox' : 'milestone');

    const total = this.countAllTasks(milestone.tasks);
    const done = this.countDoneTasks(milestone.tasks);
    this.description = `${done}/${total}`;
  }

  private countAllTasks(tasks: TaskNode[]): number {
    let count = 0;
    for (const task of tasks) {
      count += 1 + this.countAllTasks(task.children);
    }
    return count;
  }

  private countDoneTasks(tasks: TaskNode[]): number {
    let count = 0;
    for (const task of tasks) {
      if (task.status === 'done') count++;
      count += this.countDoneTasks(task.children);
    }
    return count;
  }
}

type BranchTreeItem = BranchTaskItem | BranchMilestoneItem;

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

  private loadConfig(workspace: string): PPConfig | null {
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

  private applyFilters(nodes: TaskNode[]): TaskNode[] {
    if (Object.keys(this.activeFilters).length === 0) {
      return nodes;
    }

    return nodes.map((node) => this.filterNode(node)).filter((node): node is TaskNode => node !== null);
  }

  private filterNode(node: TaskNode): TaskNode | null {
    if (!this.matchesFilter(node)) {
      const filteredChildren = node.children.map((c) => this.filterNode(c)).filter((c): c is TaskNode => c !== null);

      if (filteredChildren.length === 0) {
        return null;
      }

      return { ...node, children: filteredChildren };
    }

    const filteredChildren = node.children.map((c) => this.filterNode(c)).filter((c): c is TaskNode => c !== null);

    return { ...node, children: filteredChildren };
  }

  private matchesFilter(node: TaskNode): boolean {
    const f = this.activeFilters;

    if (f.status && !f.status.includes(node.status)) {
      return false;
    }

    if (f.priority && (!node.meta.priority || !f.priority.includes(node.meta.priority))) {
      return false;
    }

    if (f.assignee && node.meta.assignee !== f.assignee) {
      return false;
    }

    if (f.hasExternalLink && !node.meta.externalUrl && !node.meta.externalId) {
      return false;
    }

    if (f.overdue) {
      if (!node.meta.dueDate) return false;
      const date = new Date(node.meta.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date >= today) return false;
    }

    return true;
  }

  private filterTodoNodes(nodes: TaskNode[]): TaskNode[] {
    if (!this.showOnlyTodo) return nodes;

    return nodes
      .map((node) => {
        if (node.status !== 'done') {
          if (node.children.length > 0) {
            const filteredChildren = this.filterTodoNodes(node.children);
            return { ...node, children: filteredChildren };
          }
          return node;
        }

        return null;
      })
      .filter((node): node is TaskNode => node !== null);
  }

  private flattenNodes(nodes: TaskNode[]): TaskNode[] {
    const result: TaskNode[] = [];

    for (const node of nodes) {
      result.push({ ...node, children: [] });
      if (node.children.length > 0) {
        result.push(...this.flattenNodes(node.children));
      }
    }

    return result;
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
      let tasks = this.filterTodoNodes(element.milestone.tasks);
      tasks = this.applyFilters(tasks);
      if (!this.grouped) {
        tasks = this.flattenNodes(tasks);
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

      let orphanTasks = this.filterTodoNodes(this.cachedOrphanTasks);
      orphanTasks = this.applyFilters(orphanTasks);
      if (!this.grouped) {
        orphanTasks = this.flattenNodes(orphanTasks);
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
        let tasks = this.filterTodoNodes(milestone.tasks);
        tasks = this.applyFilters(tasks);
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

    let processedNodes = this.filterTodoNodes(this.cachedNodes);
    processedNodes = this.applyFilters(processedNodes);

    if (!this.grouped) {
      processedNodes = this.flattenNodes(processedNodes);
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
