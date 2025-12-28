import { CONFIG_FILE_NAME, EXTENSION_DISPLAY_NAME } from '../../common/constants';
import { INIT_RESOURCES_DIR_NAME, RESOURCES_DIR_NAME } from '../../common/constants/scripts-constants';
import { extensionStore } from '../../common/core/extension-store';
import { logger } from '../../common/lib/logger';
import { ConfigManager } from '../../common/utils/config-manager';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import type { Uri } from '../../common/vscode/vscode-types';
import { requireWorkspaceFolder } from '../../common/vscode/workspace-utils';

async function copyDirectoryRecursive(sourceUri: Uri, targetUri: Uri) {
  await VscodeHelper.createDirectory(targetUri);

  const entries = await VscodeHelper.readDirectory(sourceUri);

  for (const [name, type] of entries) {
    const sourceEntryUri = VscodeHelper.joinPath(sourceUri, name);
    const targetEntryUri = VscodeHelper.joinPath(targetUri, name);

    if (type === VscodeConstants.FileType.Directory) {
      await copyDirectoryRecursive(sourceEntryUri, targetEntryUri);
    } else {
      const content = await VscodeHelper.readFile(sourceEntryUri);
      await VscodeHelper.writeFile(targetEntryUri, content);
    }
  }
}

export async function showInitMenu() {
  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  try {
    const extensionUri = extensionStore.getExtensionUri();
    if (!extensionUri) {
      throw new Error('Extension URI not available');
    }

    const initResourcesUri = VscodeHelper.joinPath(extensionUri, RESOURCES_DIR_NAME, INIT_RESOURCES_DIR_NAME);
    const configDirPath = ConfigManager.getWorkspaceConfigDirPath(workspaceFolder);
    const configDirUri = VscodeHelper.createFileUri(configDirPath);

    await copyDirectoryRecursive(initResourcesUri, configDirUri);

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
