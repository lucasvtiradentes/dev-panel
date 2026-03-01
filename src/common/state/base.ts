import { WORKSPACE_STATE_KEY } from '../constants/scripts-constants';
import { DEFAULT_SOURCE_STATE, type SourceState } from '../schemas/shared-state.schema';
import type { WorkspaceUIState } from '../schemas/workspace-state.schema';
import type { ExtensionContext } from '../vscode/vscode-types';

export enum StateKey {
  Tasks = 'tasks',
  Replacements = 'replacements',
  Variables = 'variables',
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

type StateManagerWithSource<T> = BaseStateManager<T> & SourceStateManager;
export type StateManager<T> = BaseStateManager<T>;

let workspaceContext: ExtensionContext | null = null;

export function initWorkspaceState(context: ExtensionContext) {
  workspaceContext = context;
}

function getWorkspaceState(): WorkspaceUIState {
  if (!workspaceContext) return {};
  return workspaceContext.workspaceState.get<WorkspaceUIState>(WORKSPACE_STATE_KEY) ?? {};
}

function saveWorkspaceState(state: WorkspaceUIState) {
  if (!workspaceContext) return;
  void workspaceContext.workspaceState.update(WORKSPACE_STATE_KEY, state);
}

export function loadWorkspaceState(): WorkspaceUIState {
  return getWorkspaceState();
}

export function clearWorkspaceState() {
  if (!workspaceContext) return;
  void workspaceContext.workspaceState.update(WORKSPACE_STATE_KEY, undefined);
}

type StateManagerConfig<T> = {
  stateKey: StateKey;
  defaultState: T;
  sourceKey?: string;
};

export function createStateManager<T extends Record<string, unknown>>(
  config: StateManagerConfig<T>,
): StateManagerWithSource<T> {
  const { stateKey, defaultState, sourceKey } = config;

  return {
    load(): T {
      const state = getWorkspaceState();
      return (state[stateKey as keyof typeof state] ?? { ...defaultState }) as T;
    },

    save(newState: T) {
      const state = getWorkspaceState();
      (state as Record<string, unknown>)[stateKey] = newState;
      saveWorkspaceState(state);
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

type GroupedState = {
  isGrouped: boolean;
};

type GroupedStateMethods = {
  getIsGrouped(): boolean;
  saveIsGrouped(isGrouped: boolean): void;
};

export function createGroupedStateMethods<T extends GroupedState>(
  baseState: StateManager<T>,
  defaultGrouped = false,
): GroupedStateMethods {
  return {
    getIsGrouped(): boolean {
      return baseState.load().isGrouped ?? defaultGrouped;
    },

    saveIsGrouped(isGrouped: boolean) {
      const state = baseState.load();
      (state as GroupedState).isGrouped = isGrouped;
      baseState.save(state);
    },
  };
}
