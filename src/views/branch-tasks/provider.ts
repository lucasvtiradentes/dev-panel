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
import { getBranchContextGlobPattern } from '../../common/lib/config-manager';
import { Command, ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import { getBranchContextFilePath } from '../branch-context/markdown-parser';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

type BranchTaskNode = {
  text: string;
  isChecked: boolean;
  lineIndex: number;
  children: BranchTaskNode[];
  isHeading?: boolean;
};

export class BranchTaskItem extends vscode.TreeItem {
  constructor(
    public readonly node: BranchTaskNode,
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

function parseBranchTasksAsTree(branchTasksContent: string | undefined): { nodes: BranchTaskNode[]; lines: string[] } {
  if (!branchTasksContent) return { nodes: [], lines: [] };

  const lines = branchTasksContent.split('\n');
  const rootNodes: BranchTaskNode[] = [];
  const stack: { node: BranchTaskNode; indent: number }[] = [];
  let currentMilestone: BranchTaskNode | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const milestoneMatch = line.match(TODO_MILESTONE_PATTERN);
    if (milestoneMatch) {
      const milestoneNode: BranchTaskNode = {
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

    const node: BranchTaskNode = { text, isChecked, lineIndex: i, children: [] };

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

export class BranchTasksProvider implements vscode.TreeDataProvider<BranchTaskItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<BranchTaskItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private markdownWatcher: vscode.FileSystemWatcher | null = null;
  private currentBranch = '';
  private cachedNodes: BranchTaskNode[] = [];
  private showOnlyTodo = false;
  private grouped = true;

  constructor() {
    this.setupMarkdownWatcher();
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

  private filterTodoNodes(nodes: BranchTaskNode[]): BranchTaskNode[] {
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
      .filter((node): node is BranchTaskNode => node !== null);
  }

  private flattenNodes(nodes: BranchTaskNode[]): BranchTaskNode[] {
    const result: BranchTaskNode[] = [];

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
    if (!workspace) return;

    const globPattern = getBranchContextGlobPattern();
    this.markdownWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, globPattern));

    this.markdownWatcher.onDidChange(() => this.refresh());
  }

  setBranch(branchName: string): void {
    if (branchName !== this.currentBranch) {
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

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const taskIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (taskIndex === -1) {
      this.cachedNodes = [];
      return;
    }

    const nextSectionIndex = lines.findIndex((l, i) => i > taskIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l));
    const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
    const branchTasksContent = lines
      .slice(taskIndex + 1, endIndex)
      .join('\n')
      .trim();
    const { nodes } = parseBranchTasksAsTree(branchTasksContent);
    this.cachedNodes = nodes;
  }

  refresh(): void {
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

    this.autoToggleParentTask(lines, actualLineIndex);

    fs.writeFileSync(filePath, lines.join('\n'));
    this.refresh();
  }

  private autoToggleParentTask(lines: string[], childLineIndex: number): void {
    const childMatch = lines[childLineIndex].match(TODO_ITEM_PATTERN);
    if (!childMatch) return;

    const childIndent = Math.floor(childMatch[1].length / 2);

    if (childIndent === 0) return;

    let parentLineIndex = -1;
    for (let i = childLineIndex - 1; i >= 0; i--) {
      const match = lines[i].match(TODO_ITEM_PATTERN);
      if (!match) continue;

      const indent = Math.floor(match[1].length / 2);
      if (indent < childIndent) {
        parentLineIndex = i;
        break;
      }
    }

    if (parentLineIndex === -1) return;

    const parentMatch = lines[parentLineIndex].match(TODO_ITEM_PATTERN);
    if (!parentMatch) return;

    const parentIndent = Math.floor(parentMatch[1].length / 2);

    const children: number[] = [];
    for (let i = parentLineIndex + 1; i < lines.length; i++) {
      const match = lines[i].match(TODO_ITEM_PATTERN);
      if (!match) continue;

      const indent = Math.floor(match[1].length / 2);

      if (indent <= parentIndent) break;

      if (indent === parentIndent + 1) {
        children.push(i);
      }
    }

    if (children.length === 0) return;

    const allChildrenChecked = children.every((idx) => {
      const line = lines[idx];
      return line.includes(TODO_CHECKBOX_CHECKED_LOWER) || line.includes(TODO_CHECKBOX_CHECKED_UPPER);
    });

    const parentLine = lines[parentLineIndex];
    if (allChildrenChecked) {
      if (parentLine.includes(TODO_CHECKBOX_UNCHECKED)) {
        lines[parentLineIndex] = parentLine.replace(TODO_CHECKBOX_UNCHECKED, TODO_CHECKBOX_CHECKED_LOWER);
      }
    } else {
      if (parentLine.includes(TODO_CHECKBOX_CHECKED_LOWER) || parentLine.includes(TODO_CHECKBOX_CHECKED_UPPER)) {
        lines[parentLineIndex] = parentLine.replace(/\[[xX]\]/, TODO_CHECKBOX_UNCHECKED);
      }
    }
  }

  dispose(): void {
    this.markdownWatcher?.dispose();
  }
}
