import { globalToolsState } from '../../common/lib/global-state';
import { createStateHelpers } from '../../common/lib/state-helpers';
import { toolsState } from '../../common/workspace-state';

const helpers = createStateHelpers(globalToolsState, toolsState);

export const isFavorite = helpers.isFavorite;
export const isHidden = helpers.isHidden;

export const getActiveTools = () => toolsState.getActiveTools();
export const setActiveTools = (active: string[]) => toolsState.setActiveTools(active);
export const addActiveTool = (name: string) => toolsState.addActiveTool(name);
export const removeActiveTool = (name: string) => toolsState.removeActiveTool(name);
