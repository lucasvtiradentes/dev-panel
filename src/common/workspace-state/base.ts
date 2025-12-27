import { WORKSPACE_STATE_KEY } from '../constants/scripts-constants';
import { DEFAULT_WORKSPACE_UI_STATE, type WorkspaceUIState } from '../schemas';
import type { ExtensionContext } from '../vscode/vscode-types';

let workspaceContext: ExtensionContext | null = null;

export function initWorkspaceState(context: ExtensionContext) {
  workspaceContext = context;
}

export function getState(): WorkspaceUIState {
  if (!workspaceContext) return { ...DEFAULT_WORKSPACE_UI_STATE };
  return (
    workspaceContext.workspaceState.get<WorkspaceUIState>(WORKSPACE_STATE_KEY) ?? { ...DEFAULT_WORKSPACE_UI_STATE }
  );
}

export function saveState(state: WorkspaceUIState) {
  if (!workspaceContext) return;
  void workspaceContext.workspaceState.update(WORKSPACE_STATE_KEY, state);
}
