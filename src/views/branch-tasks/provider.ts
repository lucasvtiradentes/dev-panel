import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  CONTEXT_VALUES,
  EMPTY_TASKS_MESSAGE,
  FILE_WATCHER_DEBOUNCE_MS,
  NO_PENDING_TASKS_MESSAGE,
  getCommandId,
} from '../../common/constants';
import { getBranchContextGlobPattern, loadWorkspaceConfigFromPath } from '../../common/lib/config-manager';
import { StoreKey, extensionStore } from '../../common/lib/extension-store';
import { logger } from '../../common/lib/logger';
import { Command, ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas/config-schema';
import { getFirstWorkspacePath } from '../../common/utils/workspace-utils';
import { getBranchContextFilePath } from '../branch-context/markdown-parser';
import {
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
    const label = hasChildren ? ` ${node.text}` : node.text;
    super(label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);

    if (node.meta.externalUrl || node.meta.externalId) {
      this.contextValue = CONTEXT_VALUES.TODO_ITEM_WITH_EXTERNAL;
    } else {
      this.contextValue = CONTEXT_VALUES.TODO_ITEM;
    }
    this.description = formatTaskDescription(node.meta, node.status);
    this.tooltip = formatTaskTooltip(node.text, node.status, node.meta);

    if (hasChildren) {
      this.iconPath = new vscode.ThemeIcon('chevron-right');
    } else {
      this.iconPath = getStatusIcon(node.status, node.meta);
      this.command = {
        command: getCommandId(Command.CycleTaskStatus),
        title: 'Cycle Status',
        arguments: [node.lineIndex],
      };
    }
  }
}

export class BranchTasksProvider implements vscode.TreeDataProvider<BranchTaskItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<BranchTaskItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private markdownWatcher: vscode.FileSystemWatcher | null = null;
  private currentBranch = '';
  private cachedNodes: TaskNode[] = [];
  private showOnlyTodo = false;
  private grouped = true;
  private activeFilters: TaskFilter = {};
  private taskProvider: TaskSyncProvider;
  private fileChangeDebounce: NodeJS.Timeout | null = null;

  constructor() {
    const workspace = getFirstWorkspacePath();
    const config = workspace ? this.loadConfig(workspace) : null;
    this.taskProvider = createTaskProvider(config?.branchContext?.builtinSections?.tasks, workspace ?? undefined);
    this.setupMarkdownWatcher();
    void setContextKey(ContextKey.BranchTasksHasFilter, false);
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
      if (node.children.length > 0) {
        result.push(...this.flattenNodes(node.children));
      } else {
        result.push({ ...node, children: [] });
      }
    }

    return result;
  }

  private setupMarkdownWatcher(): void {
    const workspace = getFirstWorkspacePath();
    if (!workspace) {
      logger.warn('[BranchTasksProvider] No workspace found, watcher not setup');
      return;
    }

    const globPattern = getBranchContextGlobPattern();
    logger.info(`[BranchTasksProvider] Setting up watcher with pattern: ${globPattern}`);
    this.markdownWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, globPattern));

    this.markdownWatcher.onDidChange((uri) => {
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
    });
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
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) {
      this.cachedNodes = [];
      return;
    }

    const syncContext: SyncContext = {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath: filePath,
      branchContext: {},
    };

    this.taskProvider.getTasks(syncContext).then((nodes) => {
      this.cachedNodes = nodes;
    });
  }

  refresh(): void {
    logger.info(`[BranchTasksProvider] Refreshing tasks for branch: ${this.currentBranch}`);
    this.loadBranchTasks();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: BranchTaskItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: BranchTaskItem): Promise<BranchTaskItem[]> {
    if (element) {
      return element.node.children.map((child) => new BranchTaskItem(child, child.children.length > 0));
    }

    this.loadBranchTasks();

    if (!this.currentBranch) {
      return [];
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
      return [openFileItem as unknown as BranchTaskItem];
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

    const node = this.findNodeByLineIndex(lineIndex);
    if (!node) return;

    await this.taskProvider.onUpdateMeta(lineIndex, {}, syncContext);
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

    return {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath: filePath,
      branchContext: {},
    };
  }

  dispose(): void {
    this.markdownWatcher?.dispose();
  }
}
