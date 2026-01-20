import { CONTEXT_VALUES } from '../../common/constants';
import type { Command, TreeItemCollapsibleState } from '../../common/vscode/vscode-types';
import { BaseGroupTreeItem, ConfigTreeItem } from '../_view_base';

export class ToolGroupTreeItem extends BaseGroupTreeItem<TreeTool> {}

export class TreeTool extends ConfigTreeItem {
  get toolName(): string {
    return this.itemName;
  }

  get toolFile(): string {
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
      contextValue: CONTEXT_VALUES.TOOL,
      command,
      group,
    });
  }
}
