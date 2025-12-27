import { ConfigKey, LocationScope, getGlobalPromptFilePath } from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import type { DevPanelPrompt } from '../../../common/schemas';
import { FileIOHelper } from '../../../common/utils/file-io';
import {
  isGlobalItem,
  showConfigNotFoundError,
  showDeleteSuccessMessage,
  showInvalidItemError,
  showNoItemsFoundError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TreePrompt } from '../../../views/prompts/items';

async function handleDeletePrompt(treePrompt: TreePrompt) {
  if (!treePrompt?.promptName) {
    showInvalidItemError('prompt');
    return;
  }

  const isGlobal = isGlobalItem(treePrompt.promptName);
  const promptName = stripGlobalPrefix(treePrompt.promptName);

  if (!(await ConfigManager.confirmDelete('prompt', promptName, isGlobal))) return;

  if (isGlobal) {
    const globalConfig = ConfigManager.loadGlobalConfig();
    if (!globalConfig) {
      showConfigNotFoundError(LocationScope.Global);
      return;
    }

    if (!globalConfig.prompts?.length) {
      showNoItemsFoundError('prompt', LocationScope.Global);
      return;
    }

    const removed = ConfigManager.removeConfigItem(
      globalConfig,
      ConfigKey.Prompts,
      promptName,
    ) as DevPanelPrompt | null;
    if (!removed) {
      showNotFoundError('Prompt', promptName, LocationScope.Global);
      return;
    }

    ConfigManager.saveGlobalConfig(globalConfig);

    const globalPromptFile = getGlobalPromptFilePath(removed.file);
    FileIOHelper.deleteFile(globalPromptFile);

    showDeleteSuccessMessage('prompt', promptName, true);
    void executeCommand(Command.RefreshPrompts);
    return;
  }

  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  if (!workspaceConfig.prompts?.length) {
    showNoItemsFoundError('prompt', LocationScope.Workspace);
    return;
  }

  const removed = ConfigManager.removeConfigItem(
    workspaceConfig,
    ConfigKey.Prompts,
    promptName,
  ) as DevPanelPrompt | null;
  if (!removed) {
    showNotFoundError('Prompt', promptName, LocationScope.Workspace);
    return;
  }

  ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const workspacePromptFile = ConfigManager.getWorkspacePromptFilePath(workspaceFolder, removed.file);
  FileIOHelper.deleteFile(workspacePromptFile);

  showDeleteSuccessMessage('prompt', promptName, false);
  void executeCommand(Command.RefreshPrompts);
}

export function createDeletePromptCommand() {
  return registerCommand(Command.DeletePrompt, handleDeletePrompt);
}
