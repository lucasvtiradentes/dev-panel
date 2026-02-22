import { GLOBAL_STATE_KEY } from '../constants';
import { WORKSPACE_STATE_KEY } from '../constants/scripts-constants';
import type { GlobalUIState } from '../schemas/global-state.schema';
import { DEFAULT_SOURCE_STATE, type SourceState } from '../schemas/shared-state.schema';
import type { WorkspaceUIState } from '../schemas/workspace-state.schema';
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

type ViewState = {
  isGrouped: boolean;
  showHidden?: boolean;
  showOnlyFavorites?: boolean;
  devpanel: SourceState;
};

export type ViewStateMethods = {
  getIsGrouped(): boolean;
  saveIsGrouped(isGrouped: boolean): void;
  getShowHidden(): boolean;
  saveShowHidden(showHidden: boolean): void;
  getShowOnlyFavorites(): boolean;
  saveShowOnlyFavorites(showOnlyFavorites: boolean): void;
  getHiddenItems(): string[];
  getFavoriteItems(): string[];
  getOrder(isGrouped: boolean): string[];
  saveOrder(isGrouped: boolean, order: string[]): void;
};

export function createViewStateMethods<T extends ViewState>(baseState: StateManagerWithSource<T>): ViewStateMethods {
  return {
    getIsGrouped(): boolean {
      return baseState.load().isGrouped ?? false;
    },

    saveIsGrouped(isGrouped: boolean) {
      const state = baseState.load();
      state.isGrouped = isGrouped;
      baseState.save(state);
    },

    getShowHidden(): boolean {
      return baseState.load().showHidden ?? false;
    },

    saveShowHidden(showHidden: boolean) {
      const state = baseState.load();
      state.showHidden = showHidden;
      baseState.save(state);
    },

    getShowOnlyFavorites(): boolean {
      return baseState.load().showOnlyFavorites ?? false;
    },

    saveShowOnlyFavorites(showOnlyFavorites: boolean) {
      const state = baseState.load();
      state.showOnlyFavorites = showOnlyFavorites;
      baseState.save(state);
    },

    getHiddenItems(): string[] {
      return baseState.getSourceState().hidden;
    },

    getFavoriteItems(): string[] {
      return baseState.getSourceState().favorites;
    },

    getOrder(isGrouped: boolean): string[] {
      const sourceState = baseState.getSourceState();
      return isGrouped ? sourceState.groupOrder : sourceState.flatOrder;
    },

    saveOrder(isGrouped: boolean, order: string[]) {
      const sourceState = baseState.getSourceState();
      if (isGrouped) {
        sourceState.groupOrder = order;
      } else {
        sourceState.flatOrder = order;
      }
      baseState.saveSourceState(sourceState);
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
