import { CONTEXT_VALUES, getCommandId } from '../../common/constants';
import { vscodeExcludesState } from '../../common/state';
import { FileIOHelper } from '../../common/utils/helpers/node-helper';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { ContextKey, setContextKey } from '../../common/vscode/vscode-context';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { type TreeDataProvider, type TreeItem, TreeItemClass } from '../../common/vscode/vscode-types';
import { FileTypeGroupTreeItem } from '../_view_base';

export type VscodeExcludeItem = {
  pattern: string;
  excluded: boolean;
  isDirectory: boolean;
};

export class VscodeExcludeTreeItem extends TreeItemClass {
  constructor(public readonly item: VscodeExcludeItem) {
    super(item.pattern, VscodeConstants.TreeItemCollapsibleState.None);
    this.contextValue = item.excluded ? CONTEXT_VALUES.VSCODE_EXCLUDE_HIDDEN : CONTEXT_VALUES.VSCODE_EXCLUDE_VISIBLE;
    this.iconPath = item.excluded ? VscodeHelper.createCustomIcon('eye-closed') : undefined;
    this.command = {
      command: getCommandId('toggleVscodeExclude'),
      title: item.excluded ? 'Show' : 'Exclude',
      arguments: [this],
    };
  }
}

export class VscodeExcludesProvider implements TreeDataProvider<TreeItem> {
  private readonly _onDidChangeTreeData = VscodeHelper.createEventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private showAll: boolean;
  private grouped: boolean;

  constructor() {
    this.showAll = vscodeExcludesState.getShowAll();
    this.grouped = vscodeExcludesState.getIsGrouped();
    void setContextKey(ContextKey.VscodeExcludesShowAll, this.showAll);
    void setContextKey(ContextKey.VscodeExcludesGrouped, this.grouped);
  }

  dispose() {
    this._onDidChangeTreeData.dispose();
  }

  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  toggleShowAll() {
    this.showAll = !this.showAll;
    vscodeExcludesState.saveShowAll(this.showAll);
    void setContextKey(ContextKey.VscodeExcludesShowAll, this.showAll);
    this.refresh();
  }

  toggleGroupMode() {
    this.grouped = !this.grouped;
    vscodeExcludesState.saveIsGrouped(this.grouped);
    void setContextKey(ContextKey.VscodeExcludesGrouped, this.grouped);
    this.refresh();
  }

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): TreeItem[] {
    if (element instanceof FileTypeGroupTreeItem) return element.children;

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return [];

    const excludes = VscodeExcludesProvider.getExcludes();
    const rootItems = FileIOHelper.readDirectory(workspace, { withFileTypes: true }).map((entry) => {
      const isDirectory = FileIOHelper.isDirectoryEntry(workspace, entry);
      const directoryPattern = `${entry.name}/`;
      const matchedPattern = Object.hasOwn(excludes, directoryPattern) ? directoryPattern : entry.name;
      return {
        pattern: matchedPattern,
        excluded: excludes[matchedPattern] === true,
        isDirectory,
      };
    });
    const rootPatterns = new Set(rootItems.map((item) => item.pattern));
    const customItems = Object.entries(excludes)
      .filter(([pattern, excluded]) => excluded === true && !rootPatterns.has(pattern))
      .map(([pattern]) => ({ pattern, excluded: true, isDirectory: pattern.endsWith('/') }));
    const items = [...rootItems, ...customItems]
      .filter((item) => this.showAll || item.excluded)
      .sort((left, right) => left.pattern.localeCompare(right.pattern))
      .map((item) => new VscodeExcludeTreeItem(item));
    if (!this.grouped) return items;

    const folders = items.filter((item) => item.item.isDirectory);
    const files = items.filter((item) => !item.item.isDirectory);
    return [
      ...(folders.length > 0 ? [new FileTypeGroupTreeItem('Folders', folders)] : []),
      ...(files.length > 0 ? [new FileTypeGroupTreeItem('Files', files)] : []),
    ];
  }

  static getExcludes(): Record<string, boolean> {
    return VscodeHelper.getConfiguration('files').get<Record<string, boolean>>('exclude', {});
  }

  static async toggle(pattern: string, excluded: boolean): Promise<void> {
    const excludes = { ...VscodeExcludesProvider.getExcludes() };
    if (excluded) delete excludes[pattern];
    else excludes[pattern] = true;
    await VscodeHelper.getConfiguration('files').update('exclude', excludes, false);
  }

  static async add(pattern: string): Promise<boolean> {
    const cleaned = pattern.trim();
    if (!cleaned) return false;
    const excludes = { ...VscodeExcludesProvider.getExcludes(), [cleaned]: true };
    await VscodeHelper.getConfiguration('files').update('exclude', excludes, false);
    return true;
  }
}
