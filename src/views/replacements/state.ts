import { replacementsState } from '../../common/lib/workspace-state';

export const getIsGrouped = () => replacementsState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => replacementsState.saveIsGrouped(isGrouped);
