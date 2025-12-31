import { loadWorkspaceState } from '../../common/state';
import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { Command, registerCommand } from '../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';

async function handleShowWorkspaceState() {
  try {
    const state = loadWorkspaceState();
    const content = JSON.stringify(state, null, 2);
    await VscodeHelper.openUntitledDocument(content, 'json');
  } catch (error: unknown) {
    VscodeHelper.showToastMessage(
      ToastKind.Error,
      `Failed to show workspace state: ${TypeGuardsHelper.getErrorMessage(error)}`,
    );
  }
}

export function createShowWorkspaceStateCommand() {
  return registerCommand(Command.ShowWorkspaceState, handleShowWorkspaceState);
}
