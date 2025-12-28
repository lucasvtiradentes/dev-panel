import { GLOBAL_ITEM_PREFIX } from '../constants';
import type { StateManagerWithSource } from './base';

export function createStateHelpers<T extends Record<string, unknown>>(
  globalState: StateManagerWithSource<T>,
  workspaceState: StateManagerWithSource<T>,
) {
  return {
    isFavorite(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return globalState.isFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspaceState.isFavorite(name);
    },

    isHidden(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return globalState.isHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspaceState.isHidden(name);
    },

    toggleHidden(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return globalState.toggleHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspaceState.toggleHidden(name);
    },

    toggleFavorite(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return globalState.toggleFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspaceState.toggleFavorite(name);
    },
  };
}
