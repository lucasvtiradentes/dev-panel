import type * as vscode from 'vscode';
import { WORKSPACE_STATE_KEY } from '../../constants/scripts-constants';
import { DEFAULT_WORKSPACE_UI_STATE, type WorkspaceUIState } from '../../schemas';

let _context: vscode.ExtensionContext | null = null;

export function initWorkspaceState(context: vscode.ExtensionContext) {
  _context = context;
}

export function getState(): WorkspaceUIState {
  if (!_context) return { ...DEFAULT_WORKSPACE_UI_STATE };
  return _context.workspaceState.get<WorkspaceUIState>(WORKSPACE_STATE_KEY) ?? { ...DEFAULT_WORKSPACE_UI_STATE };
}

export function saveState(state: WorkspaceUIState) {
  if (!_context) return;
  void _context.workspaceState.update(WORKSPACE_STATE_KEY, state);
}
