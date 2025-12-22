import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  CONTEXT_VALUES,
  MARKDOWN_SECTION_HEADER_PATTERN,
  TODO_CHECKBOX_CHECKED_LOWER,
  TODO_CHECKBOX_CHECKED_UPPER,
  TODO_CHECKBOX_UNCHECKED,
  TODO_ITEM_PATTERN,
  TODO_MILESTONE_PATTERN,
  TODO_SECTION_HEADER_PATTERN,
  getCommandId,
} from '../../common/constants';
import { BRANCH_CONTEXT_GLOB_PATTERN } from '../../common/constants/scripts-constants';
import { Command } from '../../common/lib/vscode-utils';
import { getBranchContextFilePath } from '../branch-context/markdown-parser';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
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

function parseTodosAsTree(todosContent: string | undefined): { nodes: TodoNode[]; lines: string[] } {
  if (!todosContent) return { nodes: [], lines: [] };

  const lines = todosContent.split('\n');
  const rootNodes: TodoNode[] = [];
  const stack: { node: TodoNode; indent: number }[] = [];
  let currentMilestone: TodoNode | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const milestoneMatch = line.match(TODO_MILESTONE_PATTERN);
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

    const match = line.match(TODO_ITEM_PATTERN);
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

  private markdownWatcher: vscode.FileSystemWatcher | null = null;
  private currentBranch = '';
  private cachedNodes: TodoNode[] = [];

  constructor() {
    this.setupMarkdownWatcher();
  }

  private setupMarkdownWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    this.markdownWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, BRANCH_CONTEXT_GLOB_PATTERN),
    );

    this.markdownWatcher.onDidChange(() => this.refresh());
  }

  setBranch(branchName: string): void {
    if (branchName !== this.currentBranch) {
      this.currentBranch = branchName;
      this.refresh();
    }
  }

  private loadTodos(): void {
    const filePath = getBranchContextFilePath(this.currentBranch);

    if (!filePath || !fs.existsSync(filePath)) {
      this.cachedNodes = [];
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const todoIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoIndex === -1) {
      this.cachedNodes = [];
      return;
    }

    const nextSectionIndex = lines.findIndex((l, i) => i > todoIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l));
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

    this.loadTodos();

    if (!this.currentBranch) {
      return [];
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
    const filePath = getBranchContextFilePath(this.currentBranch);
    if (!filePath || !fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoSectionIndex === -1) return;

    const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
    if (actualLineIndex >= lines.length) return;

    const line = lines[actualLineIndex];
    if (line.includes(TODO_CHECKBOX_UNCHECKED)) {
      lines[actualLineIndex] = line.replace(TODO_CHECKBOX_UNCHECKED, TODO_CHECKBOX_CHECKED_LOWER);
    } else if (line.includes(TODO_CHECKBOX_CHECKED_LOWER) || line.includes(TODO_CHECKBOX_CHECKED_UPPER)) {
      lines[actualLineIndex] = line.replace(/\[[xX]\]/, TODO_CHECKBOX_UNCHECKED);
    }

    fs.writeFileSync(filePath, lines.join('\n'));
    this.refresh();
  }

  dispose(): void {
    this.markdownWatcher?.dispose();
  }
}
