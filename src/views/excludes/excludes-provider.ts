import { CONTEXT_VALUES } from '../../common/constants';
import { Git } from '../../common/lib/git';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { type TreeDataProvider, type TreeItem, TreeItemClass } from '../../common/vscode/vscode-types';
import { type ExcludeEntry, readExcludeFile } from './file-ops';

export class ExcludeTreeItem extends TreeItemClass {
  constructor(public readonly entry: ExcludeEntry) {
    super(entry.pattern, VscodeConstants.TreeItemCollapsibleState.None);
    this.contextValue = CONTEXT_VALUES.EXCLUDE_ITEM;
  }
}

let providerInstance: ExcludesProvider | null = null;

export class ExcludesProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = VscodeHelper.createEventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private _isGitRepo: boolean | null = null;

  constructor() {
    providerInstance = this;
  }

  private async checkGitRepo(): Promise<boolean> {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return false;
    this._isGitRepo = await Git.isRepository(workspace);
    return this._isGitRepo;
  }

  dispose() {
    this._onDidChangeTreeData.dispose();
    providerInstance = null;
  }

  refresh() {
    this._isGitRepo = null;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  async getChildren(): Promise<TreeItem[]> {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return [];

    if (this._isGitRepo === null) {
      await this.checkGitRepo();
    }

    if (!this._isGitRepo) return [];

    const entries = readExcludeFile(workspace);
    return entries.map((e) => new ExcludeTreeItem(e));
  }
}

export function refreshExcludes() {
  providerInstance?.refresh();
}
