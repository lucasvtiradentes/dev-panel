import { replacementsState } from '../../common/lib/workspace-state';

export const loadReplacementsState = replacementsState.load.bind(replacementsState);
export const saveReplacementsState = replacementsState.save.bind(replacementsState);
export const getIsGrouped = () => replacementsState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => replacementsState.saveIsGrouped(isGrouped);
