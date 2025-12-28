import { ConfigKey, LocationScope, getGlobalPromptFilePath } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { TreePrompt } from '../../../views/prompts/items';

async function handleCopyPromptToWorkspace(treePrompt: TreePrompt) {
  if (!treePrompt?.promptName) {
    TreeItemUtils.showInvalidItemError('prompt');
    return;
  }

  if (!TreeItemUtils.isGlobalItem(treePrompt.promptName)) {
    TreeItemUtils.showAlreadyWorkspaceMessage('prompt');
    return;
  }

  const promptName = TreeItemUtils.stripGlobalPrefix(treePrompt.promptName);

  const workspaceFolder = await VscodeHelper.selectWorkspaceFolder('Select workspace to copy prompt to');
  if (!workspaceFolder) return;

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (!globalConfig) {
    TreeItemUtils.showConfigNotFoundError(LocationScope.Global);
    return;
  }

  const prompt = globalConfig.prompts?.find((p) => p.name === promptName);
  if (!prompt) {
    TreeItemUtils.showNotFoundError('Prompt', promptName, LocationScope.Global);
    return;
  }

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder) ?? {};
  const exists = workspaceConfig.prompts?.some((p) => p.name === prompt.name);

  if (exists && !(await ConfigManager.confirmOverwrite('Prompt', prompt.name))) return;

  ConfigManager.addOrUpdateConfigItem(workspaceConfig, ConfigKey.Prompts, prompt);
  ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const globalPromptFile = getGlobalPromptFilePath(prompt.file);
  const workspacePromptFile = ConfigManager.getWorkspacePromptFilePath(workspaceFolder, prompt.file);

  if (FileIOHelper.fileExists(globalPromptFile)) {
    FileIOHelper.ensureDirectoryExists(NodePathHelper.dirname(workspacePromptFile));
    FileIOHelper.copyFile(globalPromptFile, workspacePromptFile);
  }

  TreeItemUtils.showCopySuccessMessage('Prompt', prompt.name, LocationScope.Workspace);
  void executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToWorkspaceCommand() {
  return registerCommand(Command.CopyPromptToWorkspace, handleCopyPromptToWorkspace);
}
