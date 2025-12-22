import { GLOBAL_ITEM_PREFIX } from '../../common/constants';
import { globalPromptsState } from '../../common/lib/global-state';
import { promptsState } from '../../common/lib/workspace-state';

export function isFavorite(name: string): boolean {
  if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
    return globalPromptsState.isFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
  }
  return promptsState.isFavorite(name);
}

export function isHidden(name: string): boolean {
  if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
    return globalPromptsState.isHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
  }
  return promptsState.isHidden(name);
}

export function toggleHidden(name: string): boolean {
  if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
    return globalPromptsState.toggleHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
  }
  return promptsState.toggleHidden(name);
}

export function toggleFavorite(name: string): boolean {
  if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
    return globalPromptsState.toggleFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
  }
  return promptsState.toggleFavorite(name);
}
