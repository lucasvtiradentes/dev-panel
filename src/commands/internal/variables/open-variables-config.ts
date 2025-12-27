import { CONFIG_FILE_NAME } from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import { FileIOHelper } from '../../../common/utils/file-io';
import { getFirstWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';

async function handleOpenVariablesConfig() {
  const workspace = getFirstWorkspaceFolder();
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
