import { GLOBAL_ITEM_PREFIX } from '../../common/constants';
import { globalToolsState } from '../../common/lib/global-state';
import { toolsState } from '../../common/lib/workspace-state';

export function isFavorite(name: string): boolean {
  if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
    return globalToolsState.isFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
  }
  return toolsState.isFavorite(name);
}

export function isHidden(name: string): boolean {
  if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
    return globalToolsState.isHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
  }
  return toolsState.isHidden(name);
}

export function toggleHidden(name: string): boolean {
  if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
    return globalToolsState.toggleHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
  }
  return toolsState.toggleHidden(name);
}

export function toggleFavorite(name: string): boolean {
  if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
    return globalToolsState.toggleFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
  }
  return toolsState.toggleFavorite(name);
}
