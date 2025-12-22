import { globalToolsState } from '../../common/lib/global-state';
import { createStateHelpers } from '../../common/lib/state-helpers';
import { toolsState } from '../../common/lib/workspace-state';

const helpers = createStateHelpers(globalToolsState, toolsState);

export const isFavorite = helpers.isFavorite;
export const isHidden = helpers.isHidden;
export const toggleHidden = helpers.toggleHidden;
export const toggleFavorite = helpers.toggleFavorite;
