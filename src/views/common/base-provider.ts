import * as vscode from 'vscode';
import { type ContextKey, setContextKey } from '../../common';
import type { GroupTreeItem, NamedTreeItem, SimpleStateManager, StateManager } from './types';

export type ProviderConfig<TSource = void> = {
  contextKeys: {
    grouped: ContextKey;
    hasHidden: ContextKey;
    showHidden: ContextKey;
    hasFavorites: ContextKey;
    showOnlyFavorites: ContextKey;
  };
};

export abstract class BaseTreeDataProvider<
  TItem extends NamedTreeItem,
  TGroup extends GroupTreeItem<TItem>,
  TSource = void,
> implements vscode.TreeDataProvider<TItem | TGroup>
{
  protected readonly _onDidChangeTreeData: vscode.EventEmitter<TItem | TGroup | null>;
  readonly onDidChangeTreeData: vscode.Event<TItem | TGroup | null>;

  protected _grouped: boolean;
  protected _showHidden: boolean;
  protected _showOnlyFavorites: boolean;

  constructor(
    protected readonly stateManager: StateManager<TSource> | SimpleStateManager,
    protected readonly config: ProviderConfig<TSource>,
    protected readonly getSource: (() => TSource) | null,
  ) {
    this._onDidChangeTreeData = new vscode.EventEmitter<TItem | TGroup | null>();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;

    this._grouped = stateManager.getIsGrouped();

    if (this.isSimpleStateManager(stateManager)) {
      this._showHidden = stateManager.getShowHidden();
      this._showOnlyFavorites = stateManager.getShowOnlyFavorites();
    } else {
      const source = this.getSource!();
      this._showHidden = stateManager.getShowHidden(source);
      this._showOnlyFavorites = stateManager.getShowOnlyFavorites(source);
    }

    this.updateContextKeys();
  }

  protected isSimpleStateManager(manager: StateManager<TSource> | SimpleStateManager): manager is SimpleStateManager {
    return this.getSource === null;
  }

  protected updateContextKeys(): void {
    const hiddenItems = this.getHiddenItems();
    const favoriteItems = this.getFavoriteItems();

    void setContextKey(this.config.contextKeys.grouped, this._grouped);
    void setContextKey(this.config.contextKeys.hasHidden, hiddenItems.length > 0);
    void setContextKey(this.config.contextKeys.showHidden, this._showHidden);
    void setContextKey(this.config.contextKeys.hasFavorites, favoriteItems.length > 0);
    void setContextKey(this.config.contextKeys.showOnlyFavorites, this._showOnlyFavorites);
  }

  protected getHiddenItems(): string[] {
    if (this.isSimpleStateManager(this.stateManager)) {
      return this.stateManager.getHiddenItems();
    }
    return this.stateManager.getHiddenItems(this.getSource!());
  }

  protected getFavoriteItems(): string[] {
    if (this.isSimpleStateManager(this.stateManager)) {
      return this.stateManager.getFavoriteItems();
    }
    return this.stateManager.getFavoriteItems(this.getSource!());
  }

  toggleGroupMode(): void {
    this._grouped = !this._grouped;
    this.stateManager.saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleShowHidden(): void {
    this._showHidden = !this._showHidden;
    if (this.isSimpleStateManager(this.stateManager)) {
      this.stateManager.saveShowHidden(this._showHidden);
    } else {
      this.stateManager.saveShowHidden(this.getSource!(), this._showHidden);
    }
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleShowOnlyFavorites(): void {
    this._showOnlyFavorites = !this._showOnlyFavorites;
    if (this.isSimpleStateManager(this.stateManager)) {
      this.stateManager.saveShowOnlyFavorites(this._showOnlyFavorites);
    } else {
      this.stateManager.saveShowOnlyFavorites(this.getSource!(), this._showOnlyFavorites);
    }
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleFavorite(item: TItem): void {
    const name = item.getName();
    if (name) {
      if (this.isSimpleStateManager(this.stateManager)) {
        this.stateManager.toggleFavorite(name);
      } else {
        this.stateManager.toggleFavorite(this.getSource!(), name);
      }
      this.updateContextKeys();
      this._onDidChangeTreeData.fire(null);
    }
  }

  toggleHide(item: TItem): void {
    const name = item.getName();
    if (name) {
      if (this.isSimpleStateManager(this.stateManager)) {
        this.stateManager.toggleHidden(name);
      } else {
        this.stateManager.toggleHidden(this.getSource!(), name);
      }
      this.updateContextKeys();
      this._onDidChangeTreeData.fire(null);
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  protected sortElements(elements: Array<TItem | TGroup>): Array<TItem | TGroup> {
    const order = this.getOrder();

    elements.sort((a, b) => {
      const aLabel = this.getItemLabel(a);
      const bLabel = this.getItemLabel(b);

      const aIndex = order.indexOf(aLabel);
      const bIndex = order.indexOf(bLabel);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      if (aLabel === 'no-group' && bLabel !== 'no-group') return 1;
      if (bLabel === 'no-group' && aLabel !== 'no-group') return -1;
      if (aLabel === 'other-tasks' && bLabel !== 'other-tasks') return 1;
      if (bLabel === 'other-tasks' && aLabel !== 'other-tasks') return -1;

      return aLabel.localeCompare(bLabel);
    });

    return elements;
  }

  protected getOrder(): string[] {
    if (this.isSimpleStateManager(this.stateManager)) {
      return this.stateManager.getOrder(this._grouped);
    }
    return this.stateManager.getOrder(this.getSource!(), this._grouped);
  }

  protected getItemLabel(item: TItem | TGroup): string {
    return typeof item.label === 'string' ? item.label : (item.label?.label ?? '');
  }

  getTreeItem(item: TItem | TGroup): vscode.TreeItem {
    return item;
  }

  abstract getChildren(element?: TItem | TGroup): Promise<Array<TItem | TGroup>>;
}
