import * as vscode from 'vscode';

class HelloWorldItem extends vscode.TreeItem {
  constructor() {
    super('Hello World', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('smiley');
  }
}

export class HelloView1Provider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    return Promise.resolve([new HelloWorldItem()]);
  }
}
