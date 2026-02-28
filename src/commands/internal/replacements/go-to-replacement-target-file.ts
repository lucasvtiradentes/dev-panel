import type { DevPanelReplacement } from '../../../common/schemas/config-schema';
import { NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';

type GoToReplacementTargetFileParams = { replacement?: DevPanelReplacement };

export function createGoToReplacementTargetFileCommand(): Disposable {
  return registerCommand(Command.GoToReplacementTargetFile, async (item: GoToReplacementTargetFileParams) => {
    if (item?.replacement?.target) {
      const workspaceFolder = VscodeHelper.getFirstWorkspaceFolder();
      if (!workspaceFolder) return;
      const targetPath = NodePathHelper.join(workspaceFolder.uri.fsPath, item.replacement.target);
      const uri = VscodeHelper.createFileUri(targetPath);
      await VscodeHelper.openDocument(uri);
    }
  });
}
