import { createStateHelpers, globalPromptsState, promptsState } from '../../common/state';

const helpers = createStateHelpers(globalPromptsState, promptsState);

export const isFavorite = helpers.isFavorite;
export const isHidden = helpers.isHidden;
