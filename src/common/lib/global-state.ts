import { GLOBAL_ITEM_PREFIX, GLOBAL_STATE_KEY } from '../constants';
import {
  DEFAULT_PROMPTS_STATE,
  DEFAULT_SOURCE_STATE,
  DEFAULT_TASKS_GLOBAL_STATE,
  DEFAULT_TOOLS_STATE,
  type GlobalUIState,
  type PromptsState,
  type SourceState,
  type TasksGlobalState,
  type ToolsState,
} from '../schemas';
import { TaskSource } from '../schemas/types';
import type { ExtensionContext } from '../vscode/vscode-types';

let globalContext: ExtensionContext | null = null;

export function initGlobalState(context: ExtensionContext) {
  globalContext = context;
}

export function migrateGlobalState() {
  return;
}

function getState(): GlobalUIState {
  if (!globalContext)
    return {
      tasks: { ...DEFAULT_TASKS_GLOBAL_STATE },
      tools: { ...DEFAULT_TOOLS_STATE },
      prompts: { ...DEFAULT_PROMPTS_STATE },
    };
  return (
    globalContext.globalState.get<GlobalUIState>(GLOBAL_STATE_KEY) ?? {
      tasks: { ...DEFAULT_TASKS_GLOBAL_STATE },
      tools: { ...DEFAULT_TOOLS_STATE },
      prompts: { ...DEFAULT_PROMPTS_STATE },
    }
  );
}

function saveState(state: GlobalUIState) {
  if (!globalContext) return;
  void globalContext.globalState.update(GLOBAL_STATE_KEY, state);
}

type StateType = ToolsState | TasksGlobalState | PromptsState;
type StateKey = keyof GlobalUIState;

function createGlobalStateManager<T extends StateType>(stateKey: StateKey, defaultState: T) {
  return {
    load(): T {
      return (getState()[stateKey] ?? { ...defaultState }) as T;
    },
    save(newState: T) {
      const state = getState();
      state[stateKey] = newState as never;
      saveState(state);
    },
    getSourceState(): SourceState {
      const loadedState = this.load() as Record<string, unknown>;
      return (loadedState[TaskSource.DevPanel] ?? { ...DEFAULT_SOURCE_STATE }) as SourceState;
    },
    saveSourceState(sourceState: SourceState) {
      const currentState = this.load() as Record<string, unknown>;
      currentState[TaskSource.DevPanel] = sourceState;
      this.save(currentState as T);
    },
    isFavorite(name: string): boolean {
      return this.getSourceState().favorites.includes(name);
    },
    toggleFavorite(name: string): boolean {
      const sourceState = this.getSourceState();
      const index = sourceState.favorites.indexOf(name);
      if (index === -1) {
        sourceState.favorites.push(name);
      } else {
        sourceState.favorites.splice(index, 1);
      }
      this.saveSourceState(sourceState);
      return index === -1;
    },
    isHidden(name: string): boolean {
      return this.getSourceState().hidden.includes(name);
    },
    toggleHidden(name: string): boolean {
      const sourceState = this.getSourceState();
      const index = sourceState.hidden.indexOf(name);
      if (index === -1) {
        sourceState.hidden.push(name);
      } else {
        sourceState.hidden.splice(index, 1);
      }
      this.saveSourceState(sourceState);
      return index === -1;
    },
  };
}

export const globalToolsState = createGlobalStateManager<ToolsState>('tools', DEFAULT_TOOLS_STATE);
export const globalTasksState = createGlobalStateManager<TasksGlobalState>('tasks', DEFAULT_TASKS_GLOBAL_STATE);
export const globalPromptsState = createGlobalStateManager<PromptsState>('prompts', DEFAULT_PROMPTS_STATE);

type StateManager = {
  isFavorite: (name: string) => boolean;
  isHidden: (name: string) => boolean;
  toggleFavorite: (name: string) => boolean;
  toggleHidden: (name: string) => boolean;
};

export function createStateHelpers(globalState: StateManager, workspaceState: StateManager) {
  return {
    isFavorite(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return globalState.isFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspaceState.isFavorite(name);
    },

    isHidden(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return globalState.isHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspaceState.isHidden(name);
    },

    toggleHidden(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return globalState.toggleHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspaceState.toggleHidden(name);
    },

    toggleFavorite(name: string): boolean {
      if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
        return globalState.toggleFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
      }
      return workspaceState.toggleFavorite(name);
    },
  };
}
