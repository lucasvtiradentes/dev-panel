import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { DEFAULT_TOOLS_STATE, type ToolSourceState, type ToolsState } from '../../common/types';

type BpmState = {
  tools?: ToolsState;
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

export function loadToolsState(): ToolsState {
  const state = loadFullState();
  return state.tools ?? { ...DEFAULT_TOOLS_STATE };
}

export function saveToolsState(toolsState: ToolsState): void {
  const state = loadFullState();
  state.tools = toolsState;
  saveFullState(state);
}

export function getSourceState(): ToolSourceState {
  const toolsState = loadToolsState();
  return toolsState.bpm ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };
}

export function getOrder(isGrouped: boolean): string[] {
  const state = getSourceState();
  return isGrouped ? state.groupOrder : state.flatOrder;
}

export function saveOrder(isGrouped: boolean, order: string[]): void {
  const toolsState = loadToolsState();
  const currentState = toolsState.bpm ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };

  if (isGrouped) {
    toolsState.bpm = { ...currentState, groupOrder: order };
  } else {
    toolsState.bpm = { ...currentState, flatOrder: order };
  }

  saveToolsState(toolsState);
}

export function toggleFavorite(itemName: string): boolean {
  const toolsState = loadToolsState();
  const currentState = toolsState.bpm ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };
  const favorites = [...(currentState.favorites ?? [])];

  const index = favorites.indexOf(itemName);
  if (index === -1) {
    favorites.push(itemName);
  } else {
    favorites.splice(index, 1);
  }

  toolsState.bpm = { ...currentState, favorites };
  saveToolsState(toolsState);
  return index === -1;
}

export function toggleHidden(itemName: string): boolean {
  const toolsState = loadToolsState();
  const currentState = toolsState.bpm ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };
  const hidden = [...(currentState.hidden ?? [])];

  const index = hidden.indexOf(itemName);
  if (index === -1) {
    hidden.push(itemName);
  } else {
    hidden.splice(index, 1);
  }

  toolsState.bpm = { ...currentState, hidden };
  saveToolsState(toolsState);
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
  const toolsState = loadToolsState();
  return toolsState.isGrouped ?? false;
}

export function saveIsGrouped(isGrouped: boolean): void {
  const toolsState = loadToolsState();
  toolsState.isGrouped = isGrouped;
  saveToolsState(toolsState);
}
