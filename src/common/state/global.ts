import { DEFAULT_TASKS_GLOBAL_STATE, type TasksGlobalState } from '../schemas/global-state.schema';
import {
  DEFAULT_PROMPTS_STATE,
  DEFAULT_TOOLS_STATE,
  type PromptsState,
  type ToolsState,
} from '../schemas/workspace-state.schema';
import { StateKey, type StateManagerWithSource, StorageType, createStateManager } from './base';

const baseGlobalToolsState = createStateManager<ToolsState>({
  stateKey: StateKey.Tools,
  defaultState: DEFAULT_TOOLS_STATE,
  storageType: StorageType.Global,
});

export const globalToolsState: StateManagerWithSource<ToolsState> = {
  ...baseGlobalToolsState,
};

const baseGlobalTasksState = createStateManager<TasksGlobalState>({
  stateKey: StateKey.Tasks,
  defaultState: DEFAULT_TASKS_GLOBAL_STATE,
  storageType: StorageType.Global,
});

export const globalTasksState: StateManagerWithSource<TasksGlobalState> = {
  ...baseGlobalTasksState,
};

const baseGlobalPromptsState = createStateManager<PromptsState>({
  stateKey: StateKey.Prompts,
  defaultState: DEFAULT_PROMPTS_STATE,
  storageType: StorageType.Global,
});

export const globalPromptsState: StateManagerWithSource<PromptsState> = {
  ...baseGlobalPromptsState,
};
