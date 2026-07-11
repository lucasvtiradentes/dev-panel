import { type ContextKey, setContextKey } from '../../common/vscode/vscode-context';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { TreeDataProvider, TreeItem } from '../../common/vscode/vscode-types';
import { FileTypeGroupTreeItem } from './file-type-group-tree-item';

type ExcludesViewStateManager = {
  getIsGrouped(): boolean;
  saveIsGrouped(isGrouped: boolean): void;
  getShowAll(): boolean;
  saveShowAll(showAll: boolean): void;
};

type ExcludesProviderOptions = {
  state: ExcludesViewStateManager;
  showAllContextKey: ContextKey;
  groupedContextKey: ContextKey;
};

export abstract class ExcludesProviderBase implements TreeDataProvider<TreeItem> {
  private readonly onDidChangeTreeDataEmitter = VscodeHelper.createEventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
  protected showAll: boolean;
  protected grouped: boolean;
  private readonly options: ExcludesProviderOptions;

  constructor(options: ExcludesProviderOptions) {
    this.options = options;
    this.showAll = options.state.getShowAll();
    this.grouped = options.state.getIsGrouped();
    this.updateContextKeys();
  }

  dispose() {
    this.onDidChangeTreeDataEmitter.dispose();
  }

  refresh() {
    this.fireTreeChange();
  }

  reloadWorkspaceState() {
    this.showAll = this.options.state.getShowAll();
    this.grouped = this.options.state.getIsGrouped();
    this.updateContextKeys();
    this.refresh();
  }

  toggleShowAll() {
    this.showAll = !this.showAll;
    this.options.state.saveShowAll(this.showAll);
    void setContextKey(this.options.showAllContextKey, this.showAll);
    this.fireTreeChange();
  }

  toggleGroupMode() {
    this.grouped = !this.grouped;
    this.options.state.saveIsGrouped(this.grouped);
    void setContextKey(this.options.groupedContextKey, this.grouped);
    this.fireTreeChange();
  }

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  abstract getChildren(element?: TreeItem): TreeItem[] | Promise<TreeItem[]>;

  protected fireTreeChange() {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  protected getGroupChildren(element?: TreeItem): TreeItem[] | null {
    return element instanceof FileTypeGroupTreeItem ? element.children : null;
  }

  private updateContextKeys() {
    void setContextKey(this.options.showAllContextKey, this.showAll);
    void setContextKey(this.options.groupedContextKey, this.grouped);
  }
}
