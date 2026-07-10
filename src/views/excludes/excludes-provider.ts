import { CONTEXT_VALUES, getCommandId } from '../../common/constants';
import { Git } from '../../common/lib/git';
import { FileIOHelper } from '../../common/utils/helpers/node-helper';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { ContextKey, setContextKey } from '../../common/vscode/vscode-context';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { type TreeDataProvider, type TreeItem, TreeItemClass } from '../../common/vscode/vscode-types';
import { FileTypeGroupTreeItem } from '../_view_base';
import { type ExcludeEntry, readExcludeFile } from './file-ops';

export class ExcludeTreeItem extends TreeItemClass {
  constructor(
    public readonly pattern: string,
    public readonly excluded: boolean,
    public readonly isDirectory: boolean,
    public readonly entry?: ExcludeEntry,
  ) {
    super(pattern, VscodeConstants.TreeItemCollapsibleState.None);
    this.contextValue = excluded ? CONTEXT_VALUES.GIT_EXCLUDE_HIDDEN : CONTEXT_VALUES.GIT_EXCLUDE_VISIBLE;
    this.iconPath = excluded ? VscodeHelper.createCustomIcon('eye-closed') : undefined;
    this.command = {
      command: getCommandId('toggleExclude'),
      title: excluded ? 'Show' : 'Exclude',
      arguments: [this],
    };
  }
}

let providerInstance: ExcludesProvider | null = null;

export class ExcludesProvider implements TreeDataProvider<TreeItem> {
  private readonly _onDidChangeTreeData = VscodeHelper.createEventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private _isGitRepo: boolean | null = null;
  private showAll = true;
  private grouped = false;

  constructor() {
    providerInstance = this;
    void setContextKey(ContextKey.GitExcludesShowAll, this.showAll);
    void setContextKey(ContextKey.GitExcludesGrouped, this.grouped);
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

  toggleShowAll() {
    this.showAll = !this.showAll;
    void setContextKey(ContextKey.GitExcludesShowAll, this.showAll);
    this._onDidChangeTreeData.fire(undefined);
  }

  toggleGroupMode() {
    this.grouped = !this.grouped;
    void setContextKey(ContextKey.GitExcludesGrouped, this.grouped);
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (element instanceof FileTypeGroupTreeItem) return element.children;

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return [];
    if (this._isGitRepo === null) await this.checkGitRepo();
    if (!this._isGitRepo) return [];

    const entries = readExcludeFile(workspace);
    const entriesByPattern = new Map(entries.map((entry) => [entry.pattern, entry]));
    const rootItems = FileIOHelper.readDirectory(workspace, { withFileTypes: true }).map((directoryEntry) => {
      const directoryPattern = `${directoryEntry.name}/`;
      const entry = entriesByPattern.get(directoryPattern) ?? entriesByPattern.get(directoryEntry.name);
      return new ExcludeTreeItem(
        entry?.pattern ?? (directoryEntry.isDirectory() ? directoryPattern : directoryEntry.name),
        Boolean(entry),
        directoryEntry.isDirectory(),
        entry,
      );
    });
    const rootPatterns = new Set(rootItems.map((item) => item.pattern));
    const customItems = entries
      .filter((entry) => !rootPatterns.has(entry.pattern))
      .map((entry) => new ExcludeTreeItem(entry.pattern, true, entry.pattern.endsWith('/'), entry));

    const items = [...rootItems, ...customItems]
      .filter((item) => this.showAll || item.excluded)
      .sort((left, right) => left.pattern.localeCompare(right.pattern));
    if (!this.grouped) return items;

    const folders = items.filter((item) => item.isDirectory);
    const files = items.filter((item) => !item.isDirectory);
    return [
      ...(folders.length > 0 ? [new FileTypeGroupTreeItem('Folders', folders)] : []),
      ...(files.length > 0 ? [new FileTypeGroupTreeItem('Files', files)] : []),
    ];
  }
}

export function refreshExcludes() {
  providerInstance?.refresh();
}
