import { workspaceManager } from '../../common/core/workspace-manager';
import { Command, registerCommand } from '../../common/vscode/vscode-commands';
import type { Disposable } from '../../common/vscode/vscode-types';

export function createSelectWorkspaceCommand(): Disposable {
  return registerCommand(Command.SelectWorkspace, () => workspaceManager.selectActiveWorkspace());
}
