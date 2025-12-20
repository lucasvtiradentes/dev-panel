import { toolsState } from '../../common/lib/workspace-state';

export const loadToolsState = toolsState.load.bind(toolsState);
export const saveToolsState = toolsState.save.bind(toolsState);
export const getSourceState = () => toolsState.getSourceState();
export const getOrder = (isGrouped: boolean) => toolsState.getOrder(isGrouped);
export const saveOrder = (isGrouped: boolean, order: string[]) => toolsState.saveOrder(isGrouped, order);
export const toggleFavorite = (itemName: string) => toolsState.toggleFavorite(itemName);
export const toggleHidden = (itemName: string) => toolsState.toggleHidden(itemName);
export const isFavorite = (itemName: string) => toolsState.isFavorite(itemName);
export const isHidden = (itemName: string) => toolsState.isHidden(itemName);
export const getIsGrouped = () => toolsState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => toolsState.saveIsGrouped(isGrouped);
export const getShowHidden = () => toolsState.getShowHidden();
export const saveShowHidden = (showHidden: boolean) => toolsState.saveShowHidden(showHidden);
export const getHiddenItems = () => toolsState.getHiddenItems();
export const getShowOnlyFavorites = () => toolsState.getShowOnlyFavorites();
export const saveShowOnlyFavorites = (showOnlyFavorites: boolean) =>
  toolsState.saveShowOnlyFavorites(showOnlyFavorites);
export const getFavoriteItems = () => toolsState.getFavoriteItems();
