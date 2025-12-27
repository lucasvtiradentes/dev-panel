import * as fs from 'node:fs';
import { CONFIG_FILE_NAME } from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import { getFirstWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';

export function createOpenVariablesConfigCommand() {
  return registerCommand(Command.OpenVariablesConfig, async () => {
    const workspace = getFirstWorkspaceFolder();
    if (!workspace) return;

    const configPath = ConfigManager.getWorkspaceConfigFilePath(workspace, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) {
      void VscodeHelper.showToastMessage(ToastKind.Error, `${CONFIG_FILE_NAME} not found`);
      return;
    }

    const uri = VscodeHelper.createFileUri(configPath);
    await VscodeHelper.openDocument(uri);
  });
}
