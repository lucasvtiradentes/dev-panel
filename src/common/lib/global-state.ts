import type * as vscode from 'vscode';
import { GLOBAL_STATE_KEY } from '../constants';
import {
  DEFAULT_PROMPTS_STATE,
  DEFAULT_SOURCE_STATE,
  DEFAULT_TOOLS_STATE,
  type GlobalUIState,
  type PromptsState,
  type SourceState,
  type ToolsState,
} from '../schemas';
import { TaskSourceKey } from '../schemas/types';

let _context: vscode.ExtensionContext | null = null;

export function initGlobalState(context: vscode.ExtensionContext): void {
  _context = context;
}

function getState(): GlobalUIState {
  if (!_context) return { tools: { ...DEFAULT_TOOLS_STATE }, prompts: { ...DEFAULT_PROMPTS_STATE } };
  return (
    _context.globalState.get<GlobalUIState>(GLOBAL_STATE_KEY) ?? {
      tools: { ...DEFAULT_TOOLS_STATE },
      prompts: { ...DEFAULT_PROMPTS_STATE },
    }
  );
}

function saveState(state: GlobalUIState): void {
  if (!_context) return;
  void _context.globalState.update(GLOBAL_STATE_KEY, state);
}

export const globalToolsState = {
  load(): ToolsState {
    return getState().tools ?? { ...DEFAULT_TOOLS_STATE };
  },
  save(newToolsState: ToolsState): void {
    const state = getState();
    state.tools = newToolsState;
    saveState(state);
  },
  getSourceState(): SourceState {
    return this.load()[TaskSourceKey.PP] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(sourceState: SourceState): void {
    const tools = this.load();
    tools[TaskSourceKey.PP] = sourceState;
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

export const globalPromptsState = {
  load(): PromptsState {
    return getState().prompts ?? { ...DEFAULT_PROMPTS_STATE };
  },
  save(newPromptsState: PromptsState): void {
    const state = getState();
    state.prompts = newPromptsState;
    saveState(state);
  },
  getSourceState(): SourceState {
    return this.load()[TaskSourceKey.PP] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(sourceState: SourceState): void {
    const prompts = this.load();
    prompts[TaskSourceKey.PP] = sourceState;
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
