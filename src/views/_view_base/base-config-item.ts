import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { Command, TreeItemCollapsibleState } from '../../common/vscode/vscode-types';
import { BaseNamedTreeItem } from './base-items';

type ConfigTreeItemConfig = {
  label: string;
  file: string;
  collapsibleState: TreeItemCollapsibleState;
  contextValue: string;
  command?: Command;
  group?: string;
};

export class ConfigTreeItem extends BaseNamedTreeItem {
  itemName: string;
  itemFile: string;
  group: string | undefined;

  constructor(config: ConfigTreeItemConfig) {
    super(config.label, config.collapsibleState, config.command);
    this.itemName = config.label;
    this.itemFile = config.file;
    this.group = config.group;
    this.contextValue = config.contextValue;
  }

  getName(): string {
    return this.itemName;
  }

  setFavorite(isFavorite: boolean) {
    if (isFavorite) {
      this.iconPath = VscodeIcons.FavoriteItem;
    }
  }
}
