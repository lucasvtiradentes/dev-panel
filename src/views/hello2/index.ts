import * as vscode from 'vscode';

class HelloWorldItem extends vscode.TreeItem {
  constructor() {
    super('Hello World', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('rocket');
  }
}

export class HelloView2Provider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    return Promise.resolve([new HelloWorldItem()]);
  }
}
