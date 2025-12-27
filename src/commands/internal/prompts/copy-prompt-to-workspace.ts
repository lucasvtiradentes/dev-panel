import * as fs from 'node:fs';
import { ConfigKey, LocationScope, getGlobalPromptFilePath } from '../../../common/constants';
import {
  addOrUpdateConfigItem,
  confirmOverwrite,
  ensureDirectoryExists,
  getWorkspacePromptFilePath,
  loadGlobalConfig,
  loadWorkspaceConfig,
  saveWorkspaceConfig,
} from '../../../common/lib/config-manager';
import {
  isGlobalItem,
  showAlreadyWorkspaceMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { selectWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-utils';
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

  const workspaceFolder = await selectWorkspaceFolder('Select workspace to copy prompt to');
  if (!workspaceFolder) return;

  const globalConfig = loadGlobalConfig();
  if (!globalConfig) {
    showConfigNotFoundError(LocationScope.Global);
    return;
  }

  const prompt = globalConfig.prompts?.find((p) => p.name === promptName);
  if (!prompt) {
    showNotFoundError('Prompt', promptName, LocationScope.Global);
    return;
  }

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder) ?? {};
  const exists = workspaceConfig.prompts?.some((p) => p.name === prompt.name);

  if (exists && !(await confirmOverwrite('Prompt', prompt.name))) return;

  addOrUpdateConfigItem(workspaceConfig, ConfigKey.Prompts, prompt);
  saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const globalPromptFile = getGlobalPromptFilePath(prompt.file);
  const workspacePromptFile = getWorkspacePromptFilePath(workspaceFolder, prompt.file);

  if (fs.existsSync(globalPromptFile)) {
    ensureDirectoryExists(require('node:path').dirname(workspacePromptFile));
    fs.copyFileSync(globalPromptFile, workspacePromptFile);
  }

  showCopySuccessMessage('Prompt', prompt.name, LocationScope.Workspace);
  void executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToWorkspaceCommand() {
  return registerCommand(Command.CopyPromptToWorkspace, handleCopyPromptToWorkspace);
}
