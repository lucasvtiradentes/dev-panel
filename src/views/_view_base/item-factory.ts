import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { TreeItem } from '../../common/vscode/vscode-types';

type ItemVisibilityConfig = {
  isHidden: boolean;
  isFavorite: boolean;
  showHidden: boolean;
  showOnlyFavorites: boolean;
};

type ItemStyleConfig = {
  isHidden: boolean;
  isFavorite: boolean;
  isActive?: boolean;
  contextValues: {
    default: string;
    hidden: string;
    favorite: string;
  };
};

export function shouldShowItem(config: ItemVisibilityConfig): boolean {
  if (config.isHidden && !config.showHidden) return false;
  if (config.showOnlyFavorites && !config.isFavorite) return false;
  return true;
}

export function applyItemStyle<T extends TreeItem>(item: T, config: ItemStyleConfig) {
  if (config.isHidden) {
    item.iconPath = VscodeIcons.HiddenItem;
    item.contextValue = config.contextValues.hidden;
  } else if (config.isFavorite) {
    item.iconPath = VscodeIcons.FavoriteItem;
    item.contextValue = config.contextValues.favorite;
  } else if (config.isActive) {
    item.iconPath = VscodeIcons.ActiveItem;
    item.contextValue = config.contextValues.default;
  } else {
    item.contextValue = config.contextValues.default;
  }
}
