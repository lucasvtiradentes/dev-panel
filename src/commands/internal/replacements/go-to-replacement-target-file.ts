import * as path from 'node:path';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { DevPanelReplacement } from '../../../common/schemas/config-schema';
import { getFirstWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';

export type GoToReplacementTargetFileParams = { replacement?: DevPanelReplacement };

export function createGoToReplacementTargetFileCommand(): Disposable {
  return registerCommand(Command.GoToReplacementTargetFile, async (item: GoToReplacementTargetFileParams) => {
    if (item?.replacement?.target) {
      const workspaceFolder = getFirstWorkspaceFolder();
      if (!workspaceFolder) return;
      const targetPath = path.join(workspaceFolder.uri.fsPath, item.replacement.target);
      const uri = VscodeHelper.createFileUri(targetPath);
      await VscodeHelper.openDocument(uri);
    }
  });
}
