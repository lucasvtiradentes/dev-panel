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
  type TaskSyncProvider,
  createTaskProvider,
} from '../branch-context/providers';
import { formatTaskDescription, formatTaskTooltip, getStatusIcon } from './task-item-utils';

export class BranchTaskItem extends vscode.TreeItem {
  constructor(
    public readonly node: TaskNode,
    hasChildren: boolean,
  ) {
    const label = hasChildren ? ` ${node.text}` : node.text;
    super(label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);

    this.contextValue = CONTEXT_VALUES.TODO_ITEM;
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
  private taskProvider: TaskSyncProvider;
  private fileChangeDebounce: NodeJS.Timeout | null = null;

  constructor() {
    const workspace = getFirstWorkspacePath();
    const config = workspace ? this.loadConfig(workspace) : null;
    this.taskProvider = createTaskProvider(config?.branchContext?.builtinSections?.tasks, workspace ?? undefined);
    this.setupMarkdownWatcher();
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

    if (!this.grouped) {
      processedNodes = this.flattenNodes(processedNodes);
    }

    if (processedNodes.length === 0) {
      const message = this.showOnlyTodo ? NO_PENDING_TASKS_MESSAGE : EMPTY_TASKS_MESSAGE;
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
    const filePath = getBranchContextFilePath(this.currentBranch);
    if (!filePath || !fs.existsSync(filePath)) return;

    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const task = this.findTaskByLineIndex(this.cachedNodes, lineIndex);
    if (!task) return;

    const newStatus = this.taskProvider.cycleStatus(task.status);

    const syncContext: SyncContext = {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath: filePath,
      branchContext: {},
    };

    this.taskProvider.onStatusChange(lineIndex, newStatus, syncContext).then(() => {
      this.refresh();
    });
  }

  private findTaskByLineIndex(nodes: TaskNode[], lineIndex: number): TaskNode | null {
    for (const node of nodes) {
      if (node.lineIndex === lineIndex) return node;
      if (node.children.length > 0) {
        const found = this.findTaskByLineIndex(node.children, lineIndex);
        if (found) return found;
      }
    }
    return null;
  }

  dispose(): void {
    this.markdownWatcher?.dispose();
  }
}
