import type { TreeItem } from '../../common/vscode/vscode-types';

type BaseTreeItem = TreeItem & {
  contextValue?: string;
};

export type NamedTreeItem = BaseTreeItem & {
  getName(): string;
};

export type GroupTreeItem<T extends NamedTreeItem> = BaseTreeItem & {
  children: T[];
};

export type StateManager<TSource = void> = {
  getOrder(source: TSource, isGrouped: boolean): string[];
  saveOrder(source: TSource, isGrouped: boolean, order: string[]): void;
  getIsGrouped(): boolean;
  saveIsGrouped(isGrouped: boolean): void;
  getShowHidden(source: TSource): boolean;
  saveShowHidden(source: TSource, showHidden: boolean): void;
  getShowOnlyFavorites(source: TSource): boolean;
  saveShowOnlyFavorites(source: TSource, showOnlyFavorites: boolean): void;
  toggleFavorite(source: TSource, name: string): boolean;
  toggleHidden(source: TSource, name: string): boolean;
  isFavorite(source: TSource, name: string): boolean;
  isHidden(source: TSource, name: string): boolean;
  getHiddenItems(source: TSource): string[];
  getFavoriteItems(source: TSource): string[];
};

export type SimpleStateManager = {
  getIsGrouped(): boolean;
  saveIsGrouped(isGrouped: boolean): void;
  getOrder(isGrouped: boolean): string[];
  saveOrder(isGrouped: boolean, order: string[]): void;
  getShowHidden(): boolean;
  saveShowHidden(showHidden: boolean): void;
  getShowOnlyFavorites(): boolean;
  saveShowOnlyFavorites(showOnlyFavorites: boolean): void;
  toggleFavorite(name: string): boolean;
  toggleHidden(name: string): boolean;
  isFavorite(name: string): boolean;
  isHidden(name: string): boolean;
  getHiddenItems(): string[];
  getFavoriteItems(): string[];
};

export type GlobalStateManager = {
  toggleFavorite(name: string): boolean;
  toggleHidden(name: string): boolean;
  isFavorite(name: string): boolean;
  isHidden(name: string): boolean;
  getSourceState(): {
    hidden: string[];
    favorites: string[];
  };
};

export type KeybindingConfig = {
  commandPrefix: string;
  getCommandId: (name: string) => string;
};
