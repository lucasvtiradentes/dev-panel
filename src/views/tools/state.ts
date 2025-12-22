import { globalToolsState } from '../../common/lib/global-state';
import { toolsState } from '../../common/lib/workspace-state';

export function isFavorite(name: string): boolean {
  if (name.startsWith('(G) ')) {
    return globalToolsState.isFavorite(name.substring(4));
  }
  return toolsState.isFavorite(name);
}

export function isHidden(name: string): boolean {
  if (name.startsWith('(G) ')) {
    return globalToolsState.isHidden(name.substring(4));
  }
  return toolsState.isHidden(name);
}

export function toggleHidden(name: string): boolean {
  if (name.startsWith('(G) ')) {
    return globalToolsState.toggleHidden(name.substring(4));
  }
  return toolsState.toggleHidden(name);
}

export function toggleFavorite(name: string): boolean {
  if (name.startsWith('(G) ')) {
    return globalToolsState.toggleFavorite(name.substring(4));
  }
  return toolsState.toggleFavorite(name);
}
