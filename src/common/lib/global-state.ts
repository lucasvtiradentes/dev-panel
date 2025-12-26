import type * as vscode from 'vscode';
import { GLOBAL_STATE_KEY } from '../constants';
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

let _context: vscode.ExtensionContext | null = null;

export function initGlobalState(context: vscode.ExtensionContext) {
  _context = context;
}

export function migrateGlobalState() {
  return;
}

function getState(): GlobalUIState {
  if (!_context)
    return {
      tasks: { ...DEFAULT_TASKS_GLOBAL_STATE },
      tools: { ...DEFAULT_TOOLS_STATE },
      prompts: { ...DEFAULT_PROMPTS_STATE },
    };
  return (
    _context.globalState.get<GlobalUIState>(GLOBAL_STATE_KEY) ?? {
      tasks: { ...DEFAULT_TASKS_GLOBAL_STATE },
      tools: { ...DEFAULT_TOOLS_STATE },
      prompts: { ...DEFAULT_PROMPTS_STATE },
    }
  );
}

function saveState(state: GlobalUIState) {
  if (!_context) return;
  void _context.globalState.update(GLOBAL_STATE_KEY, state);
}

export const globalToolsState = {
  load(): ToolsState {
    return getState().tools ?? { ...DEFAULT_TOOLS_STATE };
  },
  save(newToolsState: ToolsState) {
    const state = getState();
    state.tools = newToolsState;
    saveState(state);
  },
  getSourceState(): SourceState {
    return this.load()[TaskSource.DevPanel] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(sourceState: SourceState) {
    const tools = this.load();
    tools[TaskSource.DevPanel] = sourceState;
    this.save(tools);
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

export const globalTasksState = {
  load(): TasksGlobalState {
    return getState().tasks ?? { ...DEFAULT_TASKS_GLOBAL_STATE };
  },
  save(newTasksState: TasksGlobalState) {
    const state = getState();
    state.tasks = newTasksState;
    saveState(state);
  },
  getSourceState(): SourceState {
    return this.load()[TaskSource.DevPanel] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(sourceState: SourceState) {
    const tasks = this.load();
    tasks[TaskSource.DevPanel] = sourceState;
    this.save(tasks);
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

export const globalPromptsState = {
  load(): PromptsState {
    return getState().prompts ?? { ...DEFAULT_PROMPTS_STATE };
  },
  save(newPromptsState: PromptsState) {
    const state = getState();
    state.prompts = newPromptsState;
    saveState(state);
  },
  getSourceState(): SourceState {
    return this.load()[TaskSource.DevPanel] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(sourceState: SourceState) {
    const prompts = this.load();
    prompts[TaskSource.DevPanel] = sourceState;
    this.save(prompts);
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
