import { ConfigKey, LocationScope, getGlobalPromptFilePath } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { TreePrompt } from '../../../views/prompts/items';

async function handleCopyPromptToGlobal(treePrompt: TreePrompt) {
  if (!treePrompt?.promptName) {
    TreeItemUtils.showInvalidItemError('prompt');
    return;
  }

  if (TreeItemUtils.isGlobalItem(treePrompt.promptName)) {
    TreeItemUtils.showAlreadyGlobalMessage('prompt');
    return;
  }

  const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    TreeItemUtils.showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  const prompt = workspaceConfig.prompts?.find((p) => p.name === treePrompt.promptName);
  if (!prompt) {
    TreeItemUtils.showNotFoundError('Prompt', treePrompt.promptName, LocationScope.Workspace);
    return;
  }

  const globalConfig = ConfigManager.loadGlobalConfig() ?? {};
  const exists = globalConfig.prompts?.some((p) => p.name === prompt.name);

  if (exists && !(await ConfigManager.confirmOverwrite('Prompt', prompt.name))) return;

  ConfigManager.addOrUpdateConfigItem(globalConfig, ConfigKey.Prompts, prompt);
  ConfigManager.saveGlobalConfig(globalConfig);

  const workspacePromptFile = ConfigManager.getWorkspacePromptFilePath(workspaceFolder, prompt.file);
  const globalPromptFile = getGlobalPromptFilePath(prompt.file);

  if (FileIOHelper.fileExists(workspacePromptFile)) {
    FileIOHelper.ensureDirectoryExists(NodePathHelper.dirname(globalPromptFile));
    FileIOHelper.copyFile(workspacePromptFile, globalPromptFile);
  }

  TreeItemUtils.showCopySuccessMessage('Prompt', prompt.name, LocationScope.Global);
  void executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToGlobalCommand() {
  return registerCommand(Command.CopyPromptToGlobal, handleCopyPromptToGlobal);
}
