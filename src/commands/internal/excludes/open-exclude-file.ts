import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { ensureExcludeFileExists, getExcludeFilePath } from '../../../views/excludes';

export function createOpenExcludeFileCommand(): Disposable {
  return registerCommand(Command.OpenExcludeFile, async () => {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    if (!ensureExcludeFileExists(workspace)) {
      void VscodeHelper.showToastMessage(ToastKind.Error, 'Failed to create exclude file');
      return;
    }

    const filePath = getExcludeFilePath(workspace);
    const uri = VscodeHelper.createFileUri(filePath);
    await VscodeHelper.openDocument(uri);
  });
}
