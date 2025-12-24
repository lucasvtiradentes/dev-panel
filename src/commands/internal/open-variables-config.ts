import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { CONFIG_FILE_NAME } from '../../common/constants';
import { getWorkspaceConfigFilePath } from '../../common/lib/config-manager';
import { Command, registerCommand } from '../../common/lib/vscode-utils';

export function createOpenVariablesConfigCommand() {
  return registerCommand(Command.OpenVariablesConfig, async () => {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return;

    const configPath = getWorkspaceConfigFilePath(workspace, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) {
      void vscode.window.showErrorMessage(`${CONFIG_FILE_NAME} not found`);
      return;
    }

    const uri = vscode.Uri.file(configPath);
    await vscode.window.showTextDocument(uri);
  });
}
