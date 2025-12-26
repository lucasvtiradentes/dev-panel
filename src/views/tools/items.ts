import * as vscode from 'vscode';
import { CONTEXT_VALUES } from '../../common/constants';
import { BaseGroupTreeItem, BaseNamedTreeItem } from '../_base';

export class ToolGroupTreeItem extends BaseGroupTreeItem<TreeTool> {}

export class TreeTool extends BaseNamedTreeItem {
  toolName: string;
  toolFile: string;
  group: string | undefined;

  constructor(
    label: string,
    file: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command,
    group?: string,
  ) {
    super(label, collapsibleState, command);
    this.group = group;
    this.toolName = label;
    this.toolFile = file;
    this.contextValue = CONTEXT_VALUES.TOOL;
  }

  getName(): string {
    return this.toolName;
  }

  setFavorite(isFavorite: boolean): void {
    if (isFavorite) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
    }
  }
}
