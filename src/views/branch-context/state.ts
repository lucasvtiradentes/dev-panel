import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { BranchContext, BranchesState } from '../../common/types';

type BpmState = {
  branches?: BranchesState;
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

export function loadBranchContext(branchName: string): BranchContext {
  const state = loadFullState();
  return state.branches?.[branchName] ?? {};
}

export function saveBranchContext(branchName: string, context: BranchContext): void {
  const state = loadFullState();
  if (!state.branches) state.branches = {};
  state.branches[branchName] = context;
  saveFullState(state);
}

export function updateBranchField(branchName: string, field: keyof BranchContext, value: string | undefined): void {
  const context = loadBranchContext(branchName);
  context[field] = value;
  saveBranchContext(branchName, context);
}
