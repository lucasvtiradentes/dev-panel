import { configsState } from '../../common/lib/workspace-state';

export const getIsGrouped = () => configsState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => configsState.saveIsGrouped(isGrouped);
