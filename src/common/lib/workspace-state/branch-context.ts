import { type BranchContextState, DEFAULT_BRANCH_CONTEXT_STATE } from '../../schemas';
import { getState, saveState } from './base';

export const branchContextState = {
  load(): BranchContextState {
    return getState().branchContext ?? { ...DEFAULT_BRANCH_CONTEXT_STATE };
  },
  save(newBranchContextState: BranchContextState) {
    const state = getState();
    state.branchContext = newBranchContextState;
    saveState(state);
  },
  getHideEmptySections(): boolean {
    return this.load().hideEmptySections ?? false;
  },
  saveHideEmptySections(hideEmptySections: boolean) {
    const branchContext = this.load();
    branchContext.hideEmptySections = hideEmptySections;
    this.save(branchContext);
  },
};
