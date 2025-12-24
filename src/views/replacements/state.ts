import { replacementsState } from '../../common/lib/workspace-state';

export const getIsGrouped = () => replacementsState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => replacementsState.saveIsGrouped(isGrouped);

export const getActiveReplacements = () => replacementsState.getActiveReplacements();
export const setActiveReplacements = (active: string[]) => replacementsState.setActiveReplacements(active);
export const addActiveReplacement = (name: string) => replacementsState.addActiveReplacement(name);
export const removeActiveReplacement = (name: string) => replacementsState.removeActiveReplacement(name);

export const setLastBranch = (branch: string) => replacementsState.setLastBranch(branch);
