import { CONTEXT_VALUES } from '../../common/constants';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { type TreeItem, TreeItemClass } from '../../common/vscode/vscode-types';

export class FileTypeGroupTreeItem extends TreeItemClass {
  constructor(
    label: 'Folders' | 'Files',
    public readonly children: TreeItem[],
  ) {
    super(label, VscodeConstants.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.GROUP;
  }
}
