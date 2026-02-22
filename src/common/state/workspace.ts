import type { AIProvider } from '../schemas/config-schema';
import type { SourceState } from '../schemas/shared-state.schema';
import { TaskSource } from '../schemas/types';
import {
  type BranchContextState,
  DEFAULT_BRANCH_CONTEXT_STATE,
  DEFAULT_PROMPTS_STATE,
  DEFAULT_REPLACEMENTS_STATE,
  DEFAULT_TASKS_STATE,
  DEFAULT_TOOLS_STATE,
  DEFAULT_VARIABLES_STATE,
  type PromptsState,
  type ReplacementsState,
  type TasksState,
  type ToolsState,
  type VariablesState,
} from '../schemas/workspace-state.schema';
import {
  StateKey,
  type StateManager,
  type StateManagerWithSource,
  StorageType,
  type ViewStateMethods,
  createGroupedStateMethods,
  createStateManager,
  createViewStateMethods,
} from './base';

const baseToolsState = createStateManager<ToolsState>({
  stateKey: StateKey.Tools,
  defaultState: DEFAULT_TOOLS_STATE,
  storageType: StorageType.Workspace,
});

const toolsViewMethods = createViewStateMethods(baseToolsState);

export const toolsState: StateManagerWithSource<ToolsState> &
  ViewStateMethods & {
    getActiveTools(): string[];
    setActiveTools(active: string[]): void;
    addActiveTool(name: string): void;
    removeActiveTool(name: string): void;
  } = {
  ...baseToolsState,
  ...toolsViewMethods,

  getActiveTools(): string[] {
    return this.load().activeTools ?? [];
  },

  setActiveTools(active: string[]) {
    const tools = this.load();
    tools.activeTools = active;
    this.save(tools);
  },

  addActiveTool(name: string) {
    const tools = this.load();
    if (!tools.activeTools) {
      tools.activeTools = [];
    }
    if (!tools.activeTools.includes(name)) {
      tools.activeTools.push(name);
      this.save(tools);
    }
  },

  removeActiveTool(name: string) {
    const tools = this.load();
    if (tools.activeTools) {
      tools.activeTools = tools.activeTools.filter((n: string) => n !== name);
      this.save(tools);
    }
  },
};

const basePromptsState = createStateManager<PromptsState>({
  stateKey: StateKey.Prompts,
  defaultState: DEFAULT_PROMPTS_STATE,
  storageType: StorageType.Workspace,
});

const promptsViewMethods = createViewStateMethods(basePromptsState);

export const promptsState: StateManagerWithSource<PromptsState> &
  ViewStateMethods & {
    getAiProvider(): AIProvider | undefined;
    saveAiProvider(provider: AIProvider): void;
  } = {
  ...basePromptsState,
  ...promptsViewMethods,

  getAiProvider(): AIProvider | undefined {
    return this.load().aiProvider;
  },

  saveAiProvider(provider: AIProvider) {
    const prompts = this.load();
    prompts.aiProvider = provider;
    this.save(prompts);
  },
};

const baseTasksState = createStateManager<TasksState>({
  stateKey: StateKey.Tasks,
  defaultState: DEFAULT_TASKS_STATE,
  storageType: StorageType.Workspace,
});

export const tasksState: StateManager<TasksState> & {
  getCurrentSource(): TaskSource;
  saveCurrentSource(source: TaskSource): void;
  getIsGrouped(): boolean;
  saveIsGrouped(isGrouped: boolean): void;
  getSourceState(source: TaskSource): SourceState;
  saveSourceState(source: TaskSource, sourceState: SourceState): void;
  getOrder(source: TaskSource, isGrouped: boolean): string[];
  saveOrder(source: TaskSource, isGrouped: boolean, order: string[]): void;
  isFavorite(source: TaskSource, name: string): boolean;
  toggleFavorite(source: TaskSource, name: string): boolean;
  isHidden(source: TaskSource, name: string): boolean;
  toggleHidden(source: TaskSource, name: string): boolean;
  getShowHidden(source: TaskSource): boolean;
  saveShowHidden(source: TaskSource, showHidden: boolean): void;
  getHiddenItems(source: TaskSource): string[];
  getShowOnlyFavorites(source: TaskSource): boolean;
  saveShowOnlyFavorites(source: TaskSource, showOnlyFavorites: boolean): void;
  getFavoriteItems(source: TaskSource): string[];
} = {
  ...baseTasksState,

  getCurrentSource(): TaskSource {
    const tasks = this.load();
    return (tasks.current as TaskSource) ?? TaskSource.VSCode;
  },

  saveCurrentSource(source: TaskSource) {
    const tasks = this.load();
    tasks.current = source;
    this.save(tasks);
  },

  getIsGrouped(): boolean {
    return this.load().isGrouped ?? false;
  },

  saveIsGrouped(isGrouped: boolean) {
    const tasks = this.load();
    tasks.isGrouped = isGrouped;
    this.save(tasks);
  },

  getSourceState(source: TaskSource): SourceState {
    const tasks = this.load();
    const defaultSourceState = {
      favorites: [],
      hidden: [],
      flatOrder: [],
      groupOrder: [],
    };
    return (tasks[source] ?? defaultSourceState) as SourceState;
  },

  saveSourceState(source: TaskSource, sourceState: SourceState) {
    const tasks = this.load();
    (tasks as Record<string, unknown>)[source] = sourceState;
    this.save(tasks);
  },

  getOrder(source: TaskSource, isGrouped: boolean): string[] {
    const sourceState = this.getSourceState(source);
    return isGrouped ? sourceState.groupOrder : sourceState.flatOrder;
  },

  saveOrder(source: TaskSource, isGrouped: boolean, order: string[]) {
    const sourceState = this.getSourceState(source);
    if (isGrouped) {
      sourceState.groupOrder = order;
    } else {
      sourceState.flatOrder = order;
    }
    this.saveSourceState(source, sourceState);
  },

  isFavorite(source: TaskSource, name: string): boolean {
    return this.getSourceState(source).favorites.includes(name);
  },

  toggleFavorite(source: TaskSource, name: string): boolean {
    const sourceState = this.getSourceState(source);
    const index = sourceState.favorites.indexOf(name);
    if (index === -1) {
      sourceState.favorites.push(name);
    } else {
      sourceState.favorites.splice(index, 1);
    }
    this.saveSourceState(source, sourceState);
    return index === -1;
  },

  isHidden(source: TaskSource, name: string): boolean {
    return this.getSourceState(source).hidden.includes(name);
  },

  toggleHidden(source: TaskSource, name: string): boolean {
    const sourceState = this.getSourceState(source);
    const index = sourceState.hidden.indexOf(name);
    if (index === -1) {
      sourceState.hidden.push(name);
    } else {
      sourceState.hidden.splice(index, 1);
    }
    this.saveSourceState(source, sourceState);
    return index === -1;
  },

  getShowHidden(source: TaskSource): boolean {
    return this.getSourceState(source).showHidden ?? false;
  },

  saveShowHidden(source: TaskSource, showHidden: boolean) {
    const sourceState = this.getSourceState(source);
    sourceState.showHidden = showHidden;
    this.saveSourceState(source, sourceState);
  },

  getHiddenItems(source: TaskSource): string[] {
    return this.getSourceState(source).hidden;
  },

  getShowOnlyFavorites(source: TaskSource): boolean {
    return this.getSourceState(source).showOnlyFavorites ?? false;
  },

  saveShowOnlyFavorites(source: TaskSource, showOnlyFavorites: boolean) {
    const sourceState = this.getSourceState(source);
    sourceState.showOnlyFavorites = showOnlyFavorites;
    this.saveSourceState(source, sourceState);
  },

  getFavoriteItems(source: TaskSource): string[] {
    return this.getSourceState(source).favorites;
  },
};

const baseReplacementsState = createStateManager<ReplacementsState>({
  stateKey: StateKey.Replacements,
  defaultState: DEFAULT_REPLACEMENTS_STATE,
  storageType: StorageType.Workspace,
});

const replacementsGroupedMethods = createGroupedStateMethods(baseReplacementsState, true);

export const replacementsState: StateManager<ReplacementsState> & {
  getIsGrouped(): boolean;
  saveIsGrouped(isGrouped: boolean): void;
  getActiveReplacements(): string[];
  setActiveReplacements(active: string[]): void;
  addActiveReplacement(name: string): void;
  removeActiveReplacement(name: string): void;
  getLastBranch(): string;
  setLastBranch(branch: string): void;
} = {
  ...baseReplacementsState,
  ...replacementsGroupedMethods,

  getActiveReplacements(): string[] {
    return this.load().activeReplacements ?? [];
  },

  setActiveReplacements(active: string[]) {
    const replacements = this.load();
    replacements.activeReplacements = active;
    this.save(replacements);
  },

  addActiveReplacement(name: string) {
    const replacements = this.load();
    if (!replacements.activeReplacements.includes(name)) {
      replacements.activeReplacements.push(name);
      this.save(replacements);
    }
  },

  removeActiveReplacement(name: string) {
    const replacements = this.load();
    replacements.activeReplacements = replacements.activeReplacements.filter((n: string) => n !== name);
    this.save(replacements);
  },

  getLastBranch(): string {
    return this.load().lastBranch ?? '';
  },

  setLastBranch(branch: string) {
    const replacements = this.load();
    replacements.lastBranch = branch;
    this.save(replacements);
  },
};

const baseVariablesState = createStateManager<VariablesState>({
  stateKey: StateKey.Variables,
  defaultState: DEFAULT_VARIABLES_STATE,
  storageType: StorageType.Workspace,
});

const variablesGroupedMethods = createGroupedStateMethods(baseVariablesState, true);

export const variablesState: StateManager<VariablesState> & {
  getIsGrouped(): boolean;
  saveIsGrouped(isGrouped: boolean): void;
} = {
  ...baseVariablesState,
  ...variablesGroupedMethods,
};

const baseBranchContextState = createStateManager<BranchContextState>({
  stateKey: StateKey.BranchContext,
  defaultState: DEFAULT_BRANCH_CONTEXT_STATE,
  storageType: StorageType.Workspace,
});

export const branchContextState: StateManager<BranchContextState> & {
  getHideEmptySections(): boolean;
  saveHideEmptySections(hideEmptySections: boolean): void;
} = {
  ...baseBranchContextState,

  getHideEmptySections(): boolean {
    return this.load().hideEmptySections ?? false;
  },

  saveHideEmptySections(hideEmptySections: boolean) {
    const branchContext = this.load();
    branchContext.hideEmptySections = hideEmptySections;
    this.save(branchContext);
  },
};
