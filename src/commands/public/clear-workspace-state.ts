import { clearWorkspaceState } from '../../common/state';
import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { Command, registerCommand } from '../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';

async function handleClearWorkspaceState() {
  try {
    const confirm = await VscodeHelper.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Are you sure you want to clear the workspace state?',
    });
    if (confirm !== 'Yes') return;
    clearWorkspaceState();
    VscodeHelper.showToastMessage(ToastKind.Info, 'Workspace state cleared successfully');
  } catch (error: unknown) {
    VscodeHelper.showToastMessage(
      ToastKind.Error,
      `Failed to clear workspace state: ${TypeGuardsHelper.getErrorMessage(error)}`,
    );
  }
}

export function createClearWorkspaceStateCommand() {
  return registerCommand(Command.ClearWorkspaceState, handleClearWorkspaceState);
}
