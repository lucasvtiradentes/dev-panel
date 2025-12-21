import { promptsState } from '../../common/lib/workspace-state';

export const isFavorite = (itemName: string) => promptsState.isFavorite(itemName);
export const isHidden = (itemName: string) => promptsState.isHidden(itemName);
