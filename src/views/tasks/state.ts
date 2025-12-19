import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { DEFAULT_TASKS_STATE, TaskSource, type TaskSourceState, type TasksState } from '../../common/types';

type BpmState = {
  tasks?: TasksState;
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

export function loadTasksState(): TasksState {
  const state = loadFullState();
  return state.tasks ?? { ...DEFAULT_TASKS_STATE };
}

export function saveTasksState(tasksState: TasksState): void {
  const state = loadFullState();
  state.tasks = tasksState;
  saveFullState(state);
}

type SourceStateKey = 'vscode' | 'packageJson' | 'bpm';

export function getSourceStateKey(source: TaskSource): SourceStateKey {
  switch (source) {
    case TaskSource.VSCode:
      return 'vscode';
    case TaskSource.Package:
      return 'packageJson';
    case TaskSource.BPM:
      return 'bpm';
  }
}

export function getSourceState(source: TaskSource): TaskSourceState {
  const tasksState = loadTasksState();
  const key = getSourceStateKey(source);
  return tasksState[key] ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };
}

export function getOrder(source: TaskSource, isGrouped: boolean): string[] {
  const state = getSourceState(source);
  return isGrouped ? state.groupOrder : state.flatOrder;
}

export function saveSourceOrder(source: TaskSource, isGrouped: boolean, order: string[]): void {
  const tasksState = loadTasksState();
  const key = getSourceStateKey(source);
  const currentState = tasksState[key] ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };

  if (isGrouped) {
    tasksState[key] = { ...currentState, groupOrder: order };
  } else {
    tasksState[key] = { ...currentState, flatOrder: order };
  }

  saveTasksState(tasksState);
}

export function toggleFavorite(source: TaskSource, itemName: string): boolean {
  const tasksState = loadTasksState();
  const key = getSourceStateKey(source);
  const currentState = tasksState[key] ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };
  const favorites = [...(currentState.favorites ?? [])];

  const index = favorites.indexOf(itemName);
  if (index === -1) {
    favorites.push(itemName);
  } else {
    favorites.splice(index, 1);
  }

  tasksState[key] = { ...currentState, favorites };
  saveTasksState(tasksState);
  return index === -1;
}

export function toggleHidden(source: TaskSource, itemName: string): boolean {
  const tasksState = loadTasksState();
  const key = getSourceStateKey(source);
  const currentState = tasksState[key] ?? { flatOrder: [], groupOrder: [], favorites: [], hidden: [] };
  const hidden = [...(currentState.hidden ?? [])];

  const index = hidden.indexOf(itemName);
  if (index === -1) {
    hidden.push(itemName);
  } else {
    hidden.splice(index, 1);
  }

  tasksState[key] = { ...currentState, hidden };
  saveTasksState(tasksState);
  return index === -1;
}

export function isFavorite(source: TaskSource, itemName: string): boolean {
  const state = getSourceState(source);
  return (state.favorites ?? []).includes(itemName);
}

export function isHidden(source: TaskSource, itemName: string): boolean {
  const state = getSourceState(source);
  return (state.hidden ?? []).includes(itemName);
}

export function getCurrentSource(): TaskSource {
  const tasksState = loadTasksState();
  const current = tasksState.current;
  const validSources = Object.values(TaskSource) as string[];
  if (current && validSources.includes(current)) {
    return current as TaskSource;
  }
  return TaskSource.VSCode;
}

export function saveCurrentSource(source: TaskSource): void {
  const tasksState = loadTasksState();
  tasksState.current = source;
  saveTasksState(tasksState);
}

export function getIsGrouped(): boolean {
  const tasksState = loadTasksState();
  return tasksState.isGrouped ?? false;
}

export function saveIsGrouped(isGrouped: boolean): void {
  const tasksState = loadTasksState();
  tasksState.isGrouped = isGrouped;
  saveTasksState(tasksState);
}
