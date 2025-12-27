import { GLOBAL_STATE_KEY } from '../constants';
import { WORKSPACE_STATE_KEY } from '../constants/scripts-constants';
import type { GlobalUIState } from '../schemas/global-state.schema';
import type { SourceState, WorkspaceUIState } from '../schemas/workspace-state.schema';
import { DEFAULT_SOURCE_STATE } from '../schemas/workspace-state.schema';
import type { ExtensionContext } from '../vscode/vscode-types';

export enum StateKey {
  Tools = 'tools',
  Tasks = 'tasks',
  Prompts = 'prompts',
  Replacements = 'replacements',
  Variables = 'variables',
  BranchContext = 'branchContext',
}

export enum StorageType {
  Global = 'global',
  Workspace = 'workspace',
}

type BaseStateManager<T> = {
  load(): T;
  save(state: T): void;
};

type SourceStateManager = {
  getSourceState(): SourceState;
  saveSourceState(sourceState: SourceState): void;
  isFavorite(name: string): boolean;
  toggleFavorite(name: string): boolean;
  isHidden(name: string): boolean;
  toggleHidden(name: string): boolean;
};

export type StateManagerWithSource<T> = BaseStateManager<T> & SourceStateManager;
export type StateManager<T> = BaseStateManager<T>;

let globalContext: ExtensionContext | null = null;
let workspaceContext: ExtensionContext | null = null;

export function initGlobalState(context: ExtensionContext) {
  globalContext = context;
}

export function initWorkspaceState(context: ExtensionContext) {
  workspaceContext = context;
}

function getGlobalState(): GlobalUIState {
  if (!globalContext) return {};
  return globalContext.globalState.get<GlobalUIState>(GLOBAL_STATE_KEY) ?? {};
}

function saveGlobalState(state: GlobalUIState) {
  if (!globalContext) return;
  void globalContext.globalState.update(GLOBAL_STATE_KEY, state);
}

function getWorkspaceState(): WorkspaceUIState {
  if (!workspaceContext) return {};
  return workspaceContext.workspaceState.get<WorkspaceUIState>(WORKSPACE_STATE_KEY) ?? {};
}

function saveWorkspaceState(state: WorkspaceUIState) {
  if (!workspaceContext) return;
  void workspaceContext.workspaceState.update(WORKSPACE_STATE_KEY, state);
}

type StateManagerConfig<T> = {
  stateKey: StateKey;
  defaultState: T;
  storageType: StorageType;
  sourceKey?: string;
};

export function createStateManager<T extends Record<string, unknown>>(
  config: StateManagerConfig<T>,
): StateManagerWithSource<T> {
  const { stateKey, defaultState, storageType, sourceKey } = config;

  return {
    load(): T {
      const state = storageType === StorageType.Global ? getGlobalState() : getWorkspaceState();
      return (state[stateKey as keyof typeof state] ?? { ...defaultState }) as T;
    },

    save(newState: T) {
      if (storageType === StorageType.Global) {
        const state = getGlobalState();
        (state as Record<string, unknown>)[stateKey] = newState;
        saveGlobalState(state);
      } else {
        const state = getWorkspaceState();
        (state as Record<string, unknown>)[stateKey] = newState;
        saveWorkspaceState(state);
      }
    },

    getSourceState(): SourceState {
      const loadedState = this.load();
      const key = sourceKey ?? 'devpanel';
      return (loadedState[key] ?? { ...DEFAULT_SOURCE_STATE }) as SourceState;
    },

    saveSourceState(sourceState: SourceState) {
      const currentState = this.load();
      const key = sourceKey ?? 'devpanel';
      (currentState as Record<string, unknown>)[key] = sourceState;
      this.save(currentState);
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
