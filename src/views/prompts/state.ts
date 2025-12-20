import { promptsState } from '../../common/lib/workspace-state';

export const loadPromptsState = promptsState.load.bind(promptsState);
export const savePromptsState = promptsState.save.bind(promptsState);
export const getSourceState = () => promptsState.getSourceState();
export const getOrder = (isGrouped: boolean) => promptsState.getOrder(isGrouped);
export const saveOrder = (isGrouped: boolean, order: string[]) => promptsState.saveOrder(isGrouped, order);
export const toggleFavorite = (itemName: string) => promptsState.toggleFavorite(itemName);
export const toggleHidden = (itemName: string) => promptsState.toggleHidden(itemName);
export const isFavorite = (itemName: string) => promptsState.isFavorite(itemName);
export const isHidden = (itemName: string) => promptsState.isHidden(itemName);
export const getIsGrouped = () => promptsState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => promptsState.saveIsGrouped(isGrouped);
export const getShowHidden = () => promptsState.getShowHidden();
export const saveShowHidden = (showHidden: boolean) => promptsState.saveShowHidden(showHidden);
export const getHiddenItems = () => promptsState.getHiddenItems();
export const getShowOnlyFavorites = () => promptsState.getShowOnlyFavorites();
export const saveShowOnlyFavorites = (showOnlyFavorites: boolean) =>
  promptsState.saveShowOnlyFavorites(showOnlyFavorites);
export const getFavoriteItems = () => promptsState.getFavoriteItems();
