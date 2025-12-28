import { CONTEXT_VALUES } from '../../common/constants';
import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { type Command, TreeItemClass, type TreeItemCollapsibleState } from '../../common/vscode/vscode-types';
import type { GroupTreeItem as IGroupTreeItem, NamedTreeItem } from './types';

export abstract class BaseNamedTreeItem extends TreeItemClass implements NamedTreeItem {
  constructor(label: string, collapsibleState: TreeItemCollapsibleState, command?: Command) {
    super(label, collapsibleState);
    this.command = command;
  }

  abstract getName(): string;
}

export class BaseGroupTreeItem<T extends NamedTreeItem> extends TreeItemClass implements IGroupTreeItem<T> {
  children: T[] = [];

  constructor(groupName: string) {
    super(groupName, VscodeConstants.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.GROUP;
  }

  getName(): string {
    return TypeGuardsHelper.getTreeItemLabel(this);
  }
}
