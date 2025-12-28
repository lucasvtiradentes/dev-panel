import { CONFIG_FILE_NAME, EXTENSION_DISPLAY_NAME } from '../../common/constants';
import { INIT_RESOURCES_DIR_NAME, RESOURCES_DIR_NAME } from '../../common/constants/scripts-constants';
import { ConfigManager } from '../../common/core/config-manager';
import { extensionStore } from '../../common/core/extension-store';
import { logger } from '../../common/lib/logger';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';

export async function showInitMenu() {
  const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
  if (!workspaceFolder) return;

  try {
    const extensionUri = extensionStore.getExtensionUri();
    if (!extensionUri) {
      throw new Error('Extension URI not available');
    }

    const initResourcesUri = VscodeHelper.joinPath(extensionUri, RESOURCES_DIR_NAME, INIT_RESOURCES_DIR_NAME);
    const configDirPath = ConfigManager.getWorkspaceConfigDirPath(workspaceFolder);
    const configDirUri = VscodeHelper.createFileUri(configDirPath);

    await ConfigManager.copyDirectoryRecursive(initResourcesUri, configDirUri);

    logger.info(`${EXTENSION_DISPLAY_NAME} initialized successfully`);
    void VscodeHelper.showToastMessage(
      ToastKind.Info,
      `${EXTENSION_DISPLAY_NAME} initialized! Config created at ${CONFIG_FILE_NAME}`,
    );
  } catch (error) {
    logger.error('Failed to initialize ${EXTENSION_DISPLAY_NAME}: ${error}');
    void VscodeHelper.showToastMessage(ToastKind.Error, `Failed to initialize: ${error}`);
  }
}
