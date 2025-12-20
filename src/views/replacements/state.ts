import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { DEFAULT_REPLACEMENTS_STATE, type ReplacementsState } from '../../common/types';

type BpmState = {
  replacements?: ReplacementsState;
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

export function loadReplacementsState(): ReplacementsState {
  const state = loadFullState();
  return state.replacements ?? { ...DEFAULT_REPLACEMENTS_STATE };
}

export function saveReplacementsState(replacementsState: ReplacementsState): void {
  const state = loadFullState();
  state.replacements = replacementsState;
  saveFullState(state);
}

export function getIsGrouped(): boolean {
  const replacementsState = loadReplacementsState();
  return replacementsState.isGrouped ?? true;
}

export function saveIsGrouped(isGrouped: boolean): void {
  const replacementsState = loadReplacementsState();
  replacementsState.isGrouped = isGrouped;
  saveReplacementsState(replacementsState);
}
