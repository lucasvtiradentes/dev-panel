import { CONTEXT_VALUES } from '../../common/constants';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { Command, TreeItemCollapsibleState } from '../../common/vscode/vscode-types';
import { BaseGroupTreeItem, BaseNamedTreeItem } from '../_view_base';

export class ToolGroupTreeItem extends BaseGroupTreeItem<TreeTool> {}

export class TreeTool extends BaseNamedTreeItem {
  toolName: string;
  toolFile: string;
  group: string | undefined;

  constructor(
    label: string,
    file: string,
    collapsibleState: TreeItemCollapsibleState,
    command?: Command,
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

  setFavorite(isFavorite: boolean) {
    if (isFavorite) {
      this.iconPath = VscodeIcons.FavoriteItem;
    }
  }
}
