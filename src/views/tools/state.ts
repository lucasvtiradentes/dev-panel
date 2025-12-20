import { toolsState } from '../../common/lib/workspace-state';

export const isFavorite = (itemName: string) => toolsState.isFavorite(itemName);
export const isHidden = (itemName: string) => toolsState.isHidden(itemName);
