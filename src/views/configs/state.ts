import { configsState } from '../../common/lib/workspace-state';

export const loadConfigsState = configsState.load.bind(configsState);
export const saveConfigsState = configsState.save.bind(configsState);
export const getIsGrouped = () => configsState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => configsState.saveIsGrouped(isGrouped);
