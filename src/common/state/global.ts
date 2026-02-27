import { DEFAULT_TASKS_GLOBAL_STATE, type TasksGlobalState } from '../schemas/global-state.schema';
import { StateKey, type StateManagerWithSource, StorageType, createStateManager } from './base';

const baseGlobalTasksState = createStateManager<TasksGlobalState>({
  stateKey: StateKey.Tasks,
  defaultState: DEFAULT_TASKS_GLOBAL_STATE,
  storageType: StorageType.Global,
});

export const globalTasksState: StateManagerWithSource<TasksGlobalState> = {
  ...baseGlobalTasksState,
};
