import { CONTEXT_VALUES } from '../../common/constants';
import type { Command, TreeItemCollapsibleState } from '../../common/vscode/vscode-types';
import { BaseGroupTreeItem, ConfigTreeItem } from '../_view_base';

export class PromptGroupTreeItem extends BaseGroupTreeItem<TreePrompt> {}

export class TreePrompt extends ConfigTreeItem {
  get promptName(): string {
    return this.itemName;
  }

  get promptFile(): string {
    return this.itemFile;
  }

  constructor(
    label: string,
    file: string,
    collapsibleState: TreeItemCollapsibleState,
    command?: Command,
    group?: string,
  ) {
    super({
      label,
      file,
      collapsibleState,
      contextValue: CONTEXT_VALUES.PROMPT,
      command,
      group,
    });
  }
}
