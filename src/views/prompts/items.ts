import { CONTEXT_VALUES } from '../../common/constants';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { Command, TreeItemCollapsibleState } from '../../common/vscode/vscode-types';
import { BaseGroupTreeItem, BaseNamedTreeItem } from '../_view_base';

// tscanner-ignore-next-line no-empty-class
export class PromptGroupTreeItem extends BaseGroupTreeItem<TreePrompt> {}

export class TreePrompt extends BaseNamedTreeItem {
  promptName: string;
  promptFile: string;
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
    this.promptName = label;
    this.promptFile = file;
    this.contextValue = CONTEXT_VALUES.PROMPT;
  }

  getName(): string {
    return this.promptName;
  }

  setFavorite(isFavorite: boolean) {
    if (isFavorite) {
      this.iconPath = VscodeIcons.FavoriteItem;
    }
  }
}
