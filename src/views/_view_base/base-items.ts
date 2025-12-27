import * as vscode from 'vscode';
import { CONTEXT_VALUES } from '../../common/constants';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import type { Command, TreeItemCollapsibleState } from '../../common/vscode/vscode-types';
import type { GroupTreeItem as IGroupTreeItem, NamedTreeItem } from './types';

export abstract class BaseNamedTreeItem extends vscode.TreeItem implements NamedTreeItem {
  constructor(label: string, collapsibleState: TreeItemCollapsibleState, command?: Command) {
    super(label, collapsibleState);
    this.command = command;
  }

  abstract getName(): string;
}

export class BaseGroupTreeItem<T extends NamedTreeItem> extends vscode.TreeItem implements IGroupTreeItem<T> {
  children: T[] = [];

  constructor(groupName: string) {
    super(groupName, VscodeConstants.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.GROUP;
  }

  getName(): string {
    return typeof this.label === 'string' ? this.label : (this.label?.label ?? '');
  }
}
