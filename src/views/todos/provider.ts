import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { BRANCH_CONTEXT_FILE_NAME, getCommandId } from '../../common/constants/constants';
import { Command } from '../../common/lib/vscode-utils';
import { getBranchContextFilePath } from '../branch-context/markdown-parser';
import { getCurrentBranch, isGitRepository } from '../replacements/git-utils';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

type GitAPI = {
  repositories: GitRepository[];
  onDidOpenRepository: vscode.Event<GitRepository>;
};

type GitRepository = {
  state: { HEAD?: { name?: string } };
  onDidCheckout: vscode.Event<void>;
};

async function getGitAPI(): Promise<GitAPI | null> {
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  if (!gitExtension) return null;
  if (!gitExtension.isActive) await gitExtension.activate();
  return gitExtension.exports.getAPI(1);
}

type TodoNode = {
  text: string;
  isChecked: boolean;
  lineIndex: number;
  children: TodoNode[];
  isHeading?: boolean;
};

export class TodoItem extends vscode.TreeItem {
  constructor(
    public readonly node: TodoNode,
    hasChildren: boolean,
  ) {
    const label = node.isHeading ? node.text : hasChildren ? ` ${node.text}` : node.text;
    super(label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'todoItem';

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

function parseTodosAsTree(todosContent: string | undefined): { nodes: TodoNode[]; lines: string[] } {
  if (!todosContent) return { nodes: [], lines: [] };

  const lines = todosContent.split('\n');
  const rootNodes: TodoNode[] = [];
  const stack: { node: TodoNode; indent: number }[] = [];
  let currentMilestone: TodoNode | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const milestoneMatch = line.match(/^##\s+(.+)$/);
    if (milestoneMatch) {
      const milestoneNode: TodoNode = {
        text: milestoneMatch[1].trim(),
        isChecked: false,
        lineIndex: i,
        children: [],
        isHeading: true,
      };
      rootNodes.push(milestoneNode);
      currentMilestone = milestoneNode;
      stack.length = 0;
      continue;
    }

    const match = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
    if (!match) continue;

    const indent = Math.floor(match[1].length / 2);
    const isChecked = match[2].toLowerCase() === 'x';
    const text = match[3].trim();

    const node: TodoNode = { text, isChecked, lineIndex: i, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      if (currentMilestone) {
        currentMilestone.children.push(node);
      } else {
        rootNodes.push(node);
      }
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, indent });
  }

  return { nodes: rootNodes, lines };
}

export class TodosProvider implements vscode.TreeDataProvider<TodoItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TodoItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];
  private markdownWatcher: vscode.FileSystemWatcher | null = null;
  private currentBranch = '';
  private cachedNodes: TodoNode[] = [];

  constructor() {
    this.setupGitWatcher();
    this.setupMarkdownWatcher();
    this.initializeBranch();
  }

  private async setupGitWatcher(): Promise<void> {
    const gitAPI = await getGitAPI();
    if (!gitAPI) return;

    for (const repo of gitAPI.repositories) {
      this.attachRepoListeners(repo);
    }

    this.disposables.push(gitAPI.onDidOpenRepository((repo) => this.attachRepoListeners(repo)));
  }

  private attachRepoListeners(repo: GitRepository): void {
    this.disposables.push(repo.onDidCheckout(() => this.handleBranchChange()));

    const branchName = repo.state.HEAD?.name;
    if (branchName && !this.currentBranch) {
      this.currentBranch = branchName;
      this.refresh();
    }
  }

  private setupMarkdownWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    this.markdownWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, BRANCH_CONTEXT_FILE_NAME),
    );

    this.markdownWatcher.onDidChange(() => this.refresh());
  }

  private async initializeBranch(): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    if (await isGitRepository(workspace)) {
      this.currentBranch = await getCurrentBranch(workspace);
      this.refresh();
    }
  }

  private async handleBranchChange(): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    try {
      const newBranch = await getCurrentBranch(workspace);
      if (newBranch !== this.currentBranch) {
        this.currentBranch = newBranch;
        this.refresh();
      }
    } catch {
      // Ignore
    }
  }

  private loadTodos(): void {
    const filePath = getBranchContextFilePath();

    if (!filePath || !fs.existsSync(filePath)) {
      this.cachedNodes = [];
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const todoIndex = lines.findIndex((l) => /^#\s+TODO\s*$/.test(l));
    if (todoIndex === -1) {
      this.cachedNodes = [];
      return;
    }

    const nextSectionIndex = lines.findIndex((l, i) => i > todoIndex && /^#\s+/.test(l));
    const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
    const todosContent = lines
      .slice(todoIndex + 1, endIndex)
      .join('\n')
      .trim();
    const { nodes } = parseTodosAsTree(todosContent);
    this.cachedNodes = nodes;
  }

  refresh(): void {
    this.loadTodos();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TodoItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TodoItem): Promise<TodoItem[]> {
    if (element) {
      return element.node.children.map((child) => new TodoItem(child, child.children.length > 0));
    }

    const workspace = getWorkspacePath();
    if (!workspace) return [];

    if (!(await isGitRepository(workspace))) return [];

    if (!this.currentBranch) {
      this.currentBranch = await getCurrentBranch(workspace);
      this.loadTodos();
    }

    if (this.cachedNodes.length === 0) {
      const openFileItem = new vscode.TreeItem('Click to add todos');
      openFileItem.command = {
        command: getCommandId(Command.OpenBranchContextFile),
        title: 'Open Branch Context File',
      };
      return [openFileItem as unknown as TodoItem];
    }

    return this.cachedNodes.map((node) => new TodoItem(node, node.children.length > 0));
  }

  toggleTodo(lineIndex: number): void {
    const filePath = getBranchContextFilePath();
    if (!filePath || !fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => /^#\s+TODO\s*$/.test(l));
    if (todoSectionIndex === -1) return;

    const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
    if (actualLineIndex >= lines.length) return;

    const line = lines[actualLineIndex];
    if (line.includes('[ ]')) {
      lines[actualLineIndex] = line.replace('[ ]', '[x]');
    } else if (line.includes('[x]') || line.includes('[X]')) {
      lines[actualLineIndex] = line.replace(/\[[xX]\]/, '[ ]');
    }

    fs.writeFileSync(filePath, lines.join('\n'));
    this.refresh();
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.markdownWatcher?.dispose();
  }
}
