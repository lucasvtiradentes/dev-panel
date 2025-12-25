import { DEFAULT_REPLACEMENTS_STATE, type ReplacementsState } from '../../schemas';
import { getState, saveState } from './base';

export const replacementsState = {
  load(): ReplacementsState {
    return getState().replacements ?? { ...DEFAULT_REPLACEMENTS_STATE };
  },
  save(newReplacementsState: ReplacementsState): void {
    const state = getState();
    state.replacements = newReplacementsState;
    saveState(state);
  },
  getIsGrouped(): boolean {
    return this.load().isGrouped ?? true;
  },
  saveIsGrouped(isGrouped: boolean): void {
    const replacements = this.load();
    replacements.isGrouped = isGrouped;
    this.save(replacements);
  },
  getActiveReplacements(): string[] {
    return this.load().activeReplacements ?? [];
  },
  setActiveReplacements(active: string[]): void {
    const replacements = this.load();
    replacements.activeReplacements = active;
    this.save(replacements);
  },
  addActiveReplacement(name: string): void {
    const replacements = this.load();
    if (!replacements.activeReplacements.includes(name)) {
      replacements.activeReplacements.push(name);
      this.save(replacements);
    }
  },
  removeActiveReplacement(name: string): void {
    const replacements = this.load();
    replacements.activeReplacements = replacements.activeReplacements.filter((n) => n !== name);
    this.save(replacements);
  },
  getLastBranch(): string {
    return this.load().lastBranch ?? '';
  },
  setLastBranch(branch: string): void {
    const replacements = this.load();
    replacements.lastBranch = branch;
    this.save(replacements);
  },
};
