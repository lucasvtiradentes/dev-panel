import { DEFAULT_VARIABLES_STATE, type VariablesState } from '../../schemas';
import { getState, saveState } from './base';

export const variablesState = {
  load(): VariablesState {
    return getState().variables ?? { ...DEFAULT_VARIABLES_STATE };
  },
  save(newVariablesState: VariablesState) {
    const state = getState();
    state.variables = newVariablesState;
    saveState(state);
  },
  getIsGrouped(): boolean {
    return this.load().isGrouped ?? true;
  },
  saveIsGrouped(isGrouped: boolean) {
    const variables = this.load();
    variables.isGrouped = isGrouped;
    this.save(variables);
  },
};
