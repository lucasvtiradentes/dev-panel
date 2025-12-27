import { createStateHelpers, globalPromptsState } from '../../common/lib/global-state';
import { promptsState } from '../../common/workspace-state';

const helpers = createStateHelpers(globalPromptsState, promptsState);

export const isFavorite = helpers.isFavorite;
export const isHidden = helpers.isHidden;
