import type * as vscode from 'vscode';
import { CONFIG_DIR_KEY } from '../constants/constants';
import {
  DEFAULT_PROMPTS_STATE,
  DEFAULT_REPLACEMENTS_STATE,
  DEFAULT_SOURCE_STATE,
  DEFAULT_TASKS_STATE,
  DEFAULT_TOOLS_STATE,
  DEFAULT_VARIABLES_STATE,
  DEFAULT_WORKSPACE_UI_STATE,
  type PromptsState,
  type ReplacementsState,
  type SourceState,
  TaskSource,
  type TasksState,
  type ToolsState,
  type VariablesState,
  type WorkspaceUIState,
} from '../schemas/types';

const WORKSPACE_STATE_KEY = 'pp.uiState';

let _context: vscode.ExtensionContext | null = null;

export function initWorkspaceState(context: vscode.ExtensionContext): void {
  _context = context;
}

function getState(): WorkspaceUIState {
  if (!_context) return { ...DEFAULT_WORKSPACE_UI_STATE };
  return _context.workspaceState.get<WorkspaceUIState>(WORKSPACE_STATE_KEY) ?? { ...DEFAULT_WORKSPACE_UI_STATE };
}

function saveState(state: WorkspaceUIState): void {
  if (!_context) return;
  void _context.workspaceState.update(WORKSPACE_STATE_KEY, state);
}

export const tasksState = {
  load(): TasksState {
    return getState().tasks ?? { ...DEFAULT_TASKS_STATE };
  },
  save(tasksState: TasksState): void {
    const state = getState();
    state.tasks = tasksState;
    saveState(state);
  },
  getCurrentSource(): TaskSource {
    const tasks = this.load();
    return (tasks.current as TaskSource) ?? TaskSource.VSCode;
  },
  saveCurrentSource(source: TaskSource): void {
    const tasks = this.load();
    tasks.current = source;
    this.save(tasks);
  },
  getIsGrouped(): boolean {
    return this.load().isGrouped ?? false;
  },
  saveIsGrouped(isGrouped: boolean): void {
    const tasks = this.load();
    tasks.isGrouped = isGrouped;
    this.save(tasks);
  },
  getSourceState(source: TaskSource): SourceState {
    const tasks = this.load();
    const key =
      source === TaskSource.VSCode ? 'vscode' : source === TaskSource.Package ? 'packageJson' : CONFIG_DIR_KEY;
    return tasks[key] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(source: TaskSource, sourceState: SourceState): void {
    const tasks = this.load();
    const key =
      source === TaskSource.VSCode ? 'vscode' : source === TaskSource.Package ? 'packageJson' : CONFIG_DIR_KEY;
    tasks[key] = sourceState;
    this.save(tasks);
  },
  getOrder(source: TaskSource, isGrouped: boolean): string[] {
    const sourceState = this.getSourceState(source);
    return isGrouped ? sourceState.groupOrder : sourceState.flatOrder;
  },
  saveOrder(source: TaskSource, isGrouped: boolean, order: string[]): void {
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
  saveShowHidden(source: TaskSource, showHidden: boolean): void {
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
  saveShowOnlyFavorites(source: TaskSource, showOnlyFavorites: boolean): void {
    const sourceState = this.getSourceState(source);
    sourceState.showOnlyFavorites = showOnlyFavorites;
    this.saveSourceState(source, sourceState);
  },
  getFavoriteItems(source: TaskSource): string[] {
    return this.getSourceState(source).favorites;
  },
};

export const toolsState = {
  load(): ToolsState {
    return getState().tools ?? { ...DEFAULT_TOOLS_STATE };
  },
  save(toolsState: ToolsState): void {
    const state = getState();
    state.tools = toolsState;
    saveState(state);
  },
  getIsGrouped(): boolean {
    return this.load().isGrouped ?? false;
  },
  saveIsGrouped(isGrouped: boolean): void {
    const tools = this.load();
    tools.isGrouped = isGrouped;
    this.save(tools);
  },
  getShowHidden(): boolean {
    return this.load().showHidden ?? false;
  },
  saveShowHidden(showHidden: boolean): void {
    const tools = this.load();
    tools.showHidden = showHidden;
    this.save(tools);
  },
  getHiddenItems(): string[] {
    return this.getSourceState().hidden;
  },
  getShowOnlyFavorites(): boolean {
    return this.load().showOnlyFavorites ?? false;
  },
  saveShowOnlyFavorites(showOnlyFavorites: boolean): void {
    const tools = this.load();
    tools.showOnlyFavorites = showOnlyFavorites;
    this.save(tools);
  },
  getFavoriteItems(): string[] {
    return this.getSourceState().favorites;
  },
  getSourceState(): SourceState {
    return this.load()[CONFIG_DIR_KEY] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(sourceState: SourceState): void {
    const tools = this.load();
    tools[CONFIG_DIR_KEY] = sourceState;
    this.save(tools);
  },
  getOrder(isGrouped: boolean): string[] {
    const sourceState = this.getSourceState();
    return isGrouped ? sourceState.groupOrder : sourceState.flatOrder;
  },
  saveOrder(isGrouped: boolean, order: string[]): void {
    const sourceState = this.getSourceState();
    if (isGrouped) {
      sourceState.groupOrder = order;
    } else {
      sourceState.flatOrder = order;
    }
    this.saveSourceState(sourceState);
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

export const promptsState = {
  load(): PromptsState {
    return getState().prompts ?? { ...DEFAULT_PROMPTS_STATE };
  },
  save(promptsState: PromptsState): void {
    const state = getState();
    state.prompts = promptsState;
    saveState(state);
  },
  getIsGrouped(): boolean {
    return this.load().isGrouped ?? false;
  },
  saveIsGrouped(isGrouped: boolean): void {
    const prompts = this.load();
    prompts.isGrouped = isGrouped;
    this.save(prompts);
  },
  getShowHidden(): boolean {
    return this.load().showHidden ?? false;
  },
  saveShowHidden(showHidden: boolean): void {
    const prompts = this.load();
    prompts.showHidden = showHidden;
    this.save(prompts);
  },
  getHiddenItems(): string[] {
    return this.getSourceState().hidden;
  },
  getShowOnlyFavorites(): boolean {
    return this.load().showOnlyFavorites ?? false;
  },
  saveShowOnlyFavorites(showOnlyFavorites: boolean): void {
    const prompts = this.load();
    prompts.showOnlyFavorites = showOnlyFavorites;
    this.save(prompts);
  },
  getFavoriteItems(): string[] {
    return this.getSourceState().favorites;
  },
  getSourceState(): SourceState {
    return this.load()[CONFIG_DIR_KEY] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(sourceState: SourceState): void {
    const prompts = this.load();
    prompts[CONFIG_DIR_KEY] = sourceState;
    this.save(prompts);
  },
  getOrder(isGrouped: boolean): string[] {
    const sourceState = this.getSourceState();
    return isGrouped ? sourceState.groupOrder : sourceState.flatOrder;
  },
  saveOrder(isGrouped: boolean, order: string[]): void {
    const sourceState = this.getSourceState();
    if (isGrouped) {
      sourceState.groupOrder = order;
    } else {
      sourceState.flatOrder = order;
    }
    this.saveSourceState(sourceState);
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

export const variablesState = {
  load(): VariablesState {
    return getState().variables ?? { ...DEFAULT_VARIABLES_STATE };
  },
  save(variablesState: VariablesState): void {
    const state = getState();
    state.variables = variablesState;
    saveState(state);
  },
  getIsGrouped(): boolean {
    return this.load().isGrouped ?? true;
  },
  saveIsGrouped(isGrouped: boolean): void {
    const variables = this.load();
    variables.isGrouped = isGrouped;
    this.save(variables);
  },
};

export const replacementsState = {
  load(): ReplacementsState {
    return getState().replacements ?? { ...DEFAULT_REPLACEMENTS_STATE };
  },
  save(replacementsState: ReplacementsState): void {
    const state = getState();
    state.replacements = replacementsState;
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
