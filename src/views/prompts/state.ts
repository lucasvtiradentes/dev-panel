import { globalPromptsState } from '../../common/lib/global-state';
import { promptsState } from '../../common/lib/workspace-state';

export function isFavorite(name: string): boolean {
  if (name.startsWith('(G) ')) {
    return globalPromptsState.isFavorite(name.substring(4));
  }
  return promptsState.isFavorite(name);
}

export function isHidden(name: string): boolean {
  if (name.startsWith('(G) ')) {
    return globalPromptsState.isHidden(name.substring(4));
  }
  return promptsState.isHidden(name);
}

export function toggleHidden(name: string): boolean {
  if (name.startsWith('(G) ')) {
    return globalPromptsState.toggleHidden(name.substring(4));
  }
  return promptsState.toggleHidden(name);
}

export function toggleFavorite(name: string): boolean {
  if (name.startsWith('(G) ')) {
    return globalPromptsState.toggleFavorite(name.substring(4));
  }
  return promptsState.toggleFavorite(name);
}
