import { createStateHelpers, globalToolsState, toolsState } from '../../common/state';

const helpers = createStateHelpers(globalToolsState, toolsState);

export const isFavorite = helpers.isFavorite;
export const isHidden = helpers.isHidden;

export const getActiveTools = () => toolsState.getActiveTools();
export const setActiveTools = (active: string[]) => toolsState.setActiveTools(active);
export const addActiveTool = (name: string) => toolsState.addActiveTool(name);
export const removeActiveTool = (name: string) => toolsState.removeActiveTool(name);
