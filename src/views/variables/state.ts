import { variablesState } from '../../common/lib/workspace-state';

export const getIsGrouped = () => variablesState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => variablesState.saveIsGrouped(isGrouped);
