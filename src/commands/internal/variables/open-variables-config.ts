import { CONFIG_FILE_NAME } from '../../../common/constants';
import { ConfigManager } from '../../../common/utils/config-manager';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';

async function handleOpenVariablesConfig() {
  const workspace = VscodeHelper.getFirstWorkspaceFolder();
  if (!workspace) return;

  const configPath = ConfigManager.getWorkspaceConfigFilePath(workspace, CONFIG_FILE_NAME);
  if (!FileIOHelper.fileExists(configPath)) {
    void VscodeHelper.showToastMessage(ToastKind.Error, `${CONFIG_FILE_NAME} not found`);
    return;
  }

  const uri = VscodeHelper.createFileUri(configPath);
  await VscodeHelper.openDocument(uri);
}

export function createOpenVariablesConfigCommand() {
  return registerCommand(Command.OpenVariablesConfig, handleOpenVariablesConfig);
}
