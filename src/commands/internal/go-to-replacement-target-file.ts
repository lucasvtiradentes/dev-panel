import * as path from 'node:path';
import * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { PPReplacement } from '../../common/schemas/config-schema';

export function createGoToReplacementTargetFileCommand(): vscode.Disposable {
  return registerCommand(Command.GoToReplacementTargetFile, async (item: { replacement?: PPReplacement }) => {
    if (item?.replacement?.target) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;
      const targetPath = path.join(workspaceFolder.uri.fsPath, item.replacement.target);
      const uri = vscode.Uri.file(targetPath);
      await vscode.window.showTextDocument(uri);
    }
  });
}
