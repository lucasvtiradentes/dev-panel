import * as vscode from 'vscode';
import { CONFIG_FILE_NAME, EXTENSION_DISPLAY_NAME } from '../../common/constants';
import { INIT_RESOURCES_DIR_NAME, RESOURCES_DIR_NAME } from '../../common/constants/scripts-constants';
import { getWorkspaceConfigDirPath } from '../../common/lib/config-manager';
import { extensionStore } from '../../common/lib/extension-store';
import { logger } from '../../common/lib/logger';
import { requireWorkspaceFolder } from '../../common/utils/workspace-utils';

async function copyDirectoryRecursive(sourceUri: vscode.Uri, targetUri: vscode.Uri): Promise<void> {
  await vscode.workspace.fs.createDirectory(targetUri);

  const entries = await vscode.workspace.fs.readDirectory(sourceUri);

  for (const [name, type] of entries) {
    const sourceEntryUri = vscode.Uri.joinPath(sourceUri, name);
    const targetEntryUri = vscode.Uri.joinPath(targetUri, name);

    if (type === vscode.FileType.Directory) {
      await copyDirectoryRecursive(sourceEntryUri, targetEntryUri);
    } else {
      const content = await vscode.workspace.fs.readFile(sourceEntryUri);
      await vscode.workspace.fs.writeFile(targetEntryUri, content);
    }
  }
}

export async function showInitMenu(): Promise<void> {
  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  try {
    const extensionUri = extensionStore.getExtensionUri();
    if (!extensionUri) {
      throw new Error('Extension URI not available');
    }

    const initResourcesUri = vscode.Uri.joinPath(extensionUri, RESOURCES_DIR_NAME, INIT_RESOURCES_DIR_NAME);
    const configDirPath = getWorkspaceConfigDirPath(workspaceFolder);
    const configDirUri = vscode.Uri.file(configDirPath);

    await copyDirectoryRecursive(initResourcesUri, configDirUri);

    logger.info('Project Panel initialized successfully');
    void vscode.window.showInformationMessage(
      `${EXTENSION_DISPLAY_NAME} initialized! Config created at ${CONFIG_FILE_NAME}`,
    );
  } catch (error) {
    logger.error(`Failed to initialize Project Panel: ${error}`);
    void vscode.window.showErrorMessage(`Failed to initialize: ${error}`);
  }
}
