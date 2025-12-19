import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { DEFAULT_PROMPTS_STATE, type PromptsState, type SourceState } from '../../common/types';

type BpmState = {
  prompts?: PromptsState;
  [key: string]: unknown;
};

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function getStatePath(): string | null {
  const workspace = getWorkspacePath();
  if (!workspace) return null;
  return path.join(workspace, '.bpm', 'state.json');
}

function loadFullState(): BpmState {
  const statePath = getStatePath();
  if (!statePath || !fs.existsSync(statePath)) return {};
  const content = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(content);
}

function saveFullState(state: BpmState): void {
  const statePath = getStatePath();
  if (!statePath) return;

  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function loadPromptsState(): PromptsState {
  const state = loadFullState();
  return state.prompts ?? { ...DEFAULT_PROMPTS_STATE };
}

export function savePromptsState(promptsState: PromptsState): void {
  const state = loadFullState();
  state.prompts = promptsState;
  saveFullState(state);
}

export function getSourceState(): SourceState {
  const promptsState = loadPromptsState();
  return promptsState.bpm ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };
}

export function getOrder(isGrouped: boolean): string[] {
  const state = getSourceState();
  return isGrouped ? state.groupOrder : state.flatOrder;
}

export function saveOrder(isGrouped: boolean, order: string[]): void {
  const promptsState = loadPromptsState();
  const currentState = promptsState.bpm ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };

  if (isGrouped) {
    promptsState.bpm = { ...currentState, groupOrder: order };
  } else {
    promptsState.bpm = { ...currentState, flatOrder: order };
  }

  savePromptsState(promptsState);
}

export function toggleFavorite(itemName: string): boolean {
  const promptsState = loadPromptsState();
  const currentState = promptsState.bpm ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };
  const favorites = [...(currentState.favorites ?? [])];

  const index = favorites.indexOf(itemName);
  if (index === -1) {
    favorites.push(itemName);
  } else {
    favorites.splice(index, 1);
  }

  promptsState.bpm = { ...currentState, favorites };
  savePromptsState(promptsState);
  return index === -1;
}

export function toggleHidden(itemName: string): boolean {
  const promptsState = loadPromptsState();
  const currentState = promptsState.bpm ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };
  const hidden = [...(currentState.hidden ?? [])];

  const index = hidden.indexOf(itemName);
  if (index === -1) {
    hidden.push(itemName);
  } else {
    hidden.splice(index, 1);
  }

  promptsState.bpm = { ...currentState, hidden };
  savePromptsState(promptsState);
  return index === -1;
}

export function isFavorite(itemName: string): boolean {
  const state = getSourceState();
  return (state.favorites ?? []).includes(itemName);
}

export function isHidden(itemName: string): boolean {
  const state = getSourceState();
  return (state.hidden ?? []).includes(itemName);
}

export function getIsGrouped(): boolean {
  const promptsState = loadPromptsState();
  return promptsState.isGrouped ?? false;
}

export function saveIsGrouped(isGrouped: boolean): void {
  const promptsState = loadPromptsState();
  promptsState.isGrouped = isGrouped;
  savePromptsState(promptsState);
}
