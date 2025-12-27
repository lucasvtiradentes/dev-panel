import { ConfigKey, LocationScope, getGlobalPromptFilePath } from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import { FileIOHelper } from '../../../common/lib/node-helper';
import {
  isGlobalItem,
  showAlreadyGlobalMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
} from '../../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TreePrompt } from '../../../views/prompts/items';

async function handleCopyPromptToGlobal(treePrompt: TreePrompt) {
  if (!treePrompt?.promptName) {
    showInvalidItemError('prompt');
    return;
  }

  if (isGlobalItem(treePrompt.promptName)) {
    showAlreadyGlobalMessage('prompt');
    return;
  }

  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  const prompt = workspaceConfig.prompts?.find((p) => p.name === treePrompt.promptName);
  if (!prompt) {
    showNotFoundError('Prompt', treePrompt.promptName, LocationScope.Workspace);
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
    FileIOHelper.ensureDirectoryExists(require('node:path').dirname(globalPromptFile));
    FileIOHelper.copyFile(workspacePromptFile, globalPromptFile);
  }

  showCopySuccessMessage('Prompt', prompt.name, LocationScope.Global);
  void executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToGlobalCommand() {
  return registerCommand(Command.CopyPromptToGlobal, handleCopyPromptToGlobal);
}
