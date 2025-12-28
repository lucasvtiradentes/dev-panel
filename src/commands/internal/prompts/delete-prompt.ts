import { ConfigKey, LocationScope, getGlobalPromptFilePath } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import type { DevPanelPrompt } from '../../../common/schemas';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { TreePrompt } from '../../../views/prompts/items';

async function handleDeletePrompt(treePrompt: TreePrompt) {
  if (!treePrompt?.promptName) {
    TreeItemUtils.showInvalidItemError('prompt');
    return;
  }

  const isGlobal = TreeItemUtils.isGlobalItem(treePrompt.promptName);
  const promptName = TreeItemUtils.stripGlobalPrefix(treePrompt.promptName);

  if (!(await ConfigManager.confirmDelete('prompt', promptName, isGlobal))) return;

  if (isGlobal) {
    const globalConfig = ConfigManager.loadGlobalConfig();
    if (!globalConfig) {
      TreeItemUtils.showConfigNotFoundError(LocationScope.Global);
      return;
    }

    if (!globalConfig.prompts?.length) {
      TreeItemUtils.showNoItemsFoundError('prompt', LocationScope.Global);
      return;
    }

    const removed = ConfigManager.removeConfigItem(
      globalConfig,
      ConfigKey.Prompts,
      promptName,
    ) as DevPanelPrompt | null;
    if (!removed) {
      TreeItemUtils.showNotFoundError('Prompt', promptName, LocationScope.Global);
      return;
    }

    ConfigManager.saveGlobalConfig(globalConfig);

    const globalPromptFile = getGlobalPromptFilePath(removed.file);
    FileIOHelper.deleteFile(globalPromptFile);

    TreeItemUtils.showDeleteSuccessMessage('prompt', promptName, true);
    void executeCommand(Command.RefreshPrompts);
    return;
  }

  const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    TreeItemUtils.showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  if (!workspaceConfig.prompts?.length) {
    TreeItemUtils.showNoItemsFoundError('prompt', LocationScope.Workspace);
    return;
  }

  const removed = ConfigManager.removeConfigItem(
    workspaceConfig,
    ConfigKey.Prompts,
    promptName,
  ) as DevPanelPrompt | null;
  if (!removed) {
    TreeItemUtils.showNotFoundError('Prompt', promptName, LocationScope.Workspace);
    return;
  }

  ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const workspacePromptFile = ConfigManager.getWorkspacePromptFilePath(workspaceFolder, removed.file);
  FileIOHelper.deleteFile(workspacePromptFile);

  TreeItemUtils.showDeleteSuccessMessage('prompt', promptName, false);
  void executeCommand(Command.RefreshPrompts);
}

export function createDeletePromptCommand() {
  return registerCommand(Command.DeletePrompt, handleDeletePrompt);
}
