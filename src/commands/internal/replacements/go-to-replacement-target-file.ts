import * as path from 'node:path';
import * as vscode from 'vscode';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { DevPanelReplacement } from '../../../common/schemas/config-schema';
import { getFirstWorkspaceFolder } from '../../../common/utils/workspace-utils';

export type GoToReplacementTargetFileParams = { replacement?: DevPanelReplacement };

export function createGoToReplacementTargetFileCommand(): vscode.Disposable {
  return registerCommand(Command.GoToReplacementTargetFile, async (item: GoToReplacementTargetFileParams) => {
    if (item?.replacement?.target) {
      const workspaceFolder = getFirstWorkspaceFolder();
      if (!workspaceFolder) return;
      const targetPath = path.join(workspaceFolder.uri.fsPath, item.replacement.target);
      const uri = vscode.Uri.file(targetPath);
      await vscode.window.showTextDocument(uri);
    }
  });
}
