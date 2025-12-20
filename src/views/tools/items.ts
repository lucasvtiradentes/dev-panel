import * as vscode from 'vscode';

export class ToolGroupTreeItem extends vscode.TreeItem {
  children: TreeTool[] = [];

  constructor(groupName: string) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
  }
}

export class TreeTool extends vscode.TreeItem {
  toolName: string;
  group: string | undefined;

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command,
    group?: string,
  ) {
    super(label, collapsibleState);
    this.command = command;
    this.group = group;
    this.toolName = label;
    this.contextValue = 'tool';
  }

  setFavorite(isFavorite: boolean): void {
    if (isFavorite) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
    }
  }
}
