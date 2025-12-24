import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { CONFIG_FILE_NAME, CONTEXT_VALUES, getCommandId } from '../../common/constants';
import { getBranchContextGlobPattern, getConfigFilePathFromWorkspacePath } from '../../common/lib/config-manager';
import { logger } from '../../common/lib/logger';
import { Command, ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas/config-schema';
import { getBranchContextFilePath } from '../branch-context/markdown-parser';
import {
  type SyncContext,
  type TaskNode,
  type TaskSyncProvider,
  createTaskProvider,
} from '../branch-context/providers';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export class BranchTaskItem extends vscode.TreeItem {
  constructor(
    public readonly node: TaskNode,
    hasChildren: boolean,
  ) {
    let label: string;
    if (node.isHeading) {
      label = node.text;
    } else if (hasChildren) {
      label = ` ${node.text}`;
    } else {
      label = node.text;
    }
    super(label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
    this.contextValue = CONTEXT_VALUES.TODO_ITEM;

    if (hasChildren) {
      this.iconPath = undefined;
    } else {
      this.iconPath = new vscode.ThemeIcon(node.isChecked ? 'pass-filled' : 'circle-large-outline');
      this.command = {
        command: getCommandId(Command.ToggleTodo),
        title: 'Toggle Todo',
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

  constructor() {
    const workspace = getWorkspacePath();
    const config = workspace ? this.loadConfig(workspace) : null;
    this.taskProvider = createTaskProvider(config?.branchContext?.tasks, workspace ?? undefined);
    this.setupMarkdownWatcher();
  }

  private loadConfig(workspace: string): PPConfig | null {
    const configPath = getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) return null;
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON5.parse(content) as PPConfig;
    } catch {
      return null;
    }
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
        if (node.isHeading) {
          const filteredChildren = this.filterTodoNodes(node.children);
          if (filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
          return null;
        }

        if (!node.isChecked) {
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
      if (node.isHeading) {
        result.push(...this.flattenNodes(node.children));
      } else {
        if (node.children.length > 0) {
          result.push(...this.flattenNodes(node.children));
        } else {
          result.push({ ...node, children: [] });
        }
      }
    }

    return result;
  }

  private setupMarkdownWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) {
      logger.warn('[BranchTasksProvider] No workspace found, watcher not setup');
      return;
    }

    const globPattern = getBranchContextGlobPattern();
    logger.info(`[BranchTasksProvider] Setting up watcher with pattern: ${globPattern}`);
    this.markdownWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, globPattern));

    this.markdownWatcher.onDidChange((uri) => {
      logger.info(`[BranchTasksProvider] File changed: ${uri.fsPath}, currentBranch: ${this.currentBranch}`);
      this.refresh();
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

    const workspace = getWorkspacePath();
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
      const message = this.showOnlyTodo ? 'No pending tasks' : 'Click to add tasks';
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

    const workspace = getWorkspacePath();
    if (!workspace) return;

    const syncContext: SyncContext = {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath: filePath,
      branchContext: {},
    };

    this.taskProvider.onToggleTask(lineIndex, syncContext).then(() => {
      this.refresh();
    });
  }

  dispose(): void {
    this.markdownWatcher?.dispose();
  }
}
