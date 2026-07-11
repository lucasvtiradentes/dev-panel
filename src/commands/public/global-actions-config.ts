import {
  GLOBAL_ACTIONS_CONFIG_FILE_NAME,
  GLOBAL_ACTIONS_TEMPLATE_FILE_NAME,
  RESOURCES_DIR_NAME,
  TEMPLATES_RESOURCES_DIR_NAME,
} from '../../common/constants';
import { FileIOHelper, NodePathHelper } from '../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { ExtensionConfigKey, getExtensionConfig, setExtensionConfig } from '../../common/vscode/vscode-workspace';
import type { GlobalActionsManager } from '../../global-actions/global-actions-manager';

export function createConfigureGlobalActionsCommand(manager: GlobalActionsManager, context: ExtensionContext) {
  return registerCommand(Command.ConfigureGlobalActions, async () => {
    const currentConfigPath = getExtensionConfig(ExtensionConfigKey.GlobalActionsConfigPath);
    const folderPath = await VscodeHelper.showInputBox({
      prompt: 'Global Actions config folder path',
      placeHolder: '/absolute/path/to/folder',
      value: currentConfigPath ? NodePathHelper.dirname(currentConfigPath) : '',
      ignoreFocusOut: true,
      validateInput: (value) => validateFolderPath(value.trim()),
    });
    if (folderPath === undefined) return;

    const configPath = NodePathHelper.join(folderPath.trim(), GLOBAL_ACTIONS_CONFIG_FILE_NAME);
    if (!FileIOHelper.fileExists(configPath)) {
      const templatePath = context.asAbsolutePath(
        NodePathHelper.join(RESOURCES_DIR_NAME, TEMPLATES_RESOURCES_DIR_NAME, GLOBAL_ACTIONS_TEMPLATE_FILE_NAME),
      );
      FileIOHelper.copyFile(templatePath, configPath);
    }

    await setExtensionConfig(ExtensionConfigKey.GlobalActionsConfigPath, configPath);
    manager.reload();
    await VscodeHelper.openDocument(VscodeHelper.createFileUri(configPath));
  });
}

function validateFolderPath(folderPath: string): string | null {
  if (!folderPath) return 'Folder path is required';
  if (!NodePathHelper.isAbsolute(folderPath)) return 'Folder path must be absolute';
  if (!FileIOHelper.fileExists(folderPath)) return 'Folder does not exist';
  if (!FileIOHelper.stat(folderPath).isDirectory()) return 'Path must point to a folder';
  return null;
}

export function createRemoveGlobalActionsConfigCommand(manager: GlobalActionsManager) {
  return registerCommand(Command.RemoveGlobalActionsConfig, async () => {
    await setExtensionConfig(ExtensionConfigKey.GlobalActionsConfigPath, undefined);
    manager.reload();
    void VscodeHelper.showToastMessage(ToastKind.Info, 'Global Actions config removed');
  });
}
