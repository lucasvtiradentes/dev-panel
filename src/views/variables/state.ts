import { variablesState } from '../../common/state';

export const getIsGrouped = () => variablesState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => variablesState.saveIsGrouped(isGrouped);
