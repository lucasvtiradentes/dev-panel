import { GLOBAL_ITEM_PREFIX } from '../constants';
import type { StateManagerWithSource } from './base';

type StateManager = {
  isFavorite: (name: string) => boolean;
  isHidden: (name: string) => boolean;
  toggleFavorite: (name: string) => boolean;
  toggleHidden: (name: string) => boolean;
};

export function createStateHelpers<T extends Record<string, unknown>>(
  globalState: StateManagerWithSource<T>,
  workspaceState: StateManagerWithSource<T>,
) {
  const global = globalState as unknown as StateManager;
  const workspace = workspaceState as unknown as StateManager;

  return {
    isFavorite(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return global.isFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspace.isFavorite(name);
    },

    isHidden(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return global.isHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspace.isHidden(name);
    },

    toggleHidden(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return global.toggleHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspace.toggleHidden(name);
    },

    toggleFavorite(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return global.toggleFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspace.toggleFavorite(name);
    },
  };
}
