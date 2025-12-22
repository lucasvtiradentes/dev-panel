import * as vscode from 'vscode';
import { CONTEXT_VALUES } from '../../common/constants';
import { BaseGroupTreeItem, BaseNamedTreeItem } from '../common';

export class PromptGroupTreeItem extends BaseGroupTreeItem<TreePrompt> {}

export class TreePrompt extends BaseNamedTreeItem {
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
    super(label, collapsibleState, command);
    this.group = group;
    this.promptName = label;
    this.promptFile = file;
    this.contextValue = CONTEXT_VALUES.PROMPT;
  }

  getName(): string {
    return this.promptName;
  }

  setFavorite(isFavorite: boolean): void {
    if (isFavorite) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
    }
  }
}
