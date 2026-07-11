import type { DevPanelReplacement } from '../../../common/schemas/config-schema';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { getReplacementPath } from '../../../views/replacements/file-ops';

type GoToReplacementTargetFileParams = { replacement?: DevPanelReplacement };

export function createGoToReplacementTargetFileCommand(): Disposable {
  return registerCommand(Command.GoToReplacementTargetFile, async (item: GoToReplacementTargetFileParams) => {
    if (item?.replacement?.target) {
      const workspaceFolder = VscodeHelper.getActiveWorkspaceFolder();
      if (!workspaceFolder) return;
      const targetPath = getReplacementPath(workspaceFolder.uri.fsPath, item.replacement.target);
      const uri = VscodeHelper.createFileUri(targetPath);
      await VscodeHelper.openDocument(uri);
    }
  });
}
