import { ConfigKey, LocationScope, getGlobalPromptFilePath } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import {
  isGlobalItem,
  showAlreadyWorkspaceMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { TreePrompt } from '../../../views/prompts/items';

async function handleCopyPromptToWorkspace(treePrompt: TreePrompt) {
  if (!treePrompt?.promptName) {
    showInvalidItemError('prompt');
    return;
  }

  if (!isGlobalItem(treePrompt.promptName)) {
    showAlreadyWorkspaceMessage('prompt');
    return;
  }

  const promptName = stripGlobalPrefix(treePrompt.promptName);

  const workspaceFolder = await VscodeHelper.selectWorkspaceFolder('Select workspace to copy prompt to');
  if (!workspaceFolder) return;

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (!globalConfig) {
    showConfigNotFoundError(LocationScope.Global);
    return;
  }

  const prompt = globalConfig.prompts?.find((p) => p.name === promptName);
  if (!prompt) {
    showNotFoundError('Prompt', promptName, LocationScope.Global);
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

  showCopySuccessMessage('Prompt', prompt.name, LocationScope.Workspace);
  void executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToWorkspaceCommand() {
  return registerCommand(Command.CopyPromptToWorkspace, handleCopyPromptToWorkspace);
}
