import * as vscode from 'vscode';

export class PromptGroupTreeItem extends vscode.TreeItem {
  children: TreePrompt[] = [];

  constructor(groupName: string) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
  }
}

export class TreePrompt extends vscode.TreeItem {
  promptName: string;
  promptFile: string;
  group: string | undefined;

  constructor(
    label: string,
    file: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command,
    group?: string,
  ) {
    super(label, collapsibleState);
    this.command = command;
    this.group = group;
    this.promptName = label;
    this.promptFile = file;
    this.contextValue = 'prompt';
  }

  setFavorite(isFavorite: boolean): void {
    if (isFavorite) {
      this.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
    }
  }
}
