import { FILE_WATCHER_DEBOUNCE_MS } from '../../common/constants';
import { StoreKey, extensionStore } from '../../common/core/extension-store';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { TreeDataProvider, TreeItem, TreeView, Uri } from '../../common/vscode/vscode-types';

export abstract class BaseBranchProvider<T> implements TreeDataProvider<T> {
  protected _onDidChangeTreeData = VscodeHelper.createEventEmitter<T | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  protected currentBranch = '';
  protected fileChangeDebounce: NodeJS.Timeout | null = null;
  protected isInitializing = true;
  protected lastManualRefreshTime = 0;
  protected treeView: TreeView<T> | null = null;

  setTreeView(treeView: TreeView<T>) {
    this.treeView = treeView;
    this.updateDescription();
  }

  setBranch(branchName: string) {
    if (branchName === this.currentBranch) {
      this.isInitializing = false;
      return;
    }
    this.currentBranch = branchName;
    const wasInitializing = this.isInitializing;
    this.isInitializing = false;
    if (!wasInitializing) {
      this.refresh();
    }
  }

  handleMarkdownChange(uri: Uri) {
    if (extensionStore.get(StoreKey.IsWritingBranchContext)) return;
    if (this.shouldSkipMarkdownChange(uri)) return;
    this.debouncedRefresh();
  }

  protected debouncedRefresh() {
    if (this.fileChangeDebounce) clearTimeout(this.fileChangeDebounce);
    this.fileChangeDebounce = setTimeout(() => {
      this.refresh();
      this.fileChangeDebounce = null;
    }, FILE_WATCHER_DEBOUNCE_MS);
  }

  protected shouldSkipRefresh(): boolean {
    return Date.now() - this.lastManualRefreshTime < FILE_WATCHER_DEBOUNCE_MS * 2;
  }

  refreshIfNeeded() {
    if (!this.shouldSkipRefresh()) {
      this.refresh();
    }
  }

  dispose() {
    if (this.fileChangeDebounce) {
      clearTimeout(this.fileChangeDebounce);
    }
  }

  getTreeItem(element: T): TreeItem {
    return element as TreeItem;
  }

  abstract refresh(): void;
  abstract updateDescription(): void;
  abstract getChildren(element?: T): T[] | Promise<T[]>;
  protected shouldSkipMarkdownChange(_uri: Uri): boolean {
    return false;
  }
}
