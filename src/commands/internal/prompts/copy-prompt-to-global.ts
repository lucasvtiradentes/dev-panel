import * as fs from 'node:fs';
import { ConfigKey, LocationScope, getGlobalPromptFilePath } from '../../../common/constants';
import {
  addOrUpdateConfigItem,
  confirmOverwrite,
  ensureDirectoryExists,
  getWorkspacePromptFilePath,
  loadGlobalConfig,
  loadWorkspaceConfig,
  saveGlobalConfig,
} from '../../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../../common/lib/vscode-utils';
import {
  isGlobalItem,
  showAlreadyGlobalMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
} from '../../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
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

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  const prompt = workspaceConfig.prompts?.find((p) => p.name === treePrompt.promptName);
  if (!prompt) {
    showNotFoundError('Prompt', treePrompt.promptName, LocationScope.Workspace);
    return;
  }

  const globalConfig = loadGlobalConfig() ?? {};
  const exists = globalConfig.prompts?.some((p) => p.name === prompt.name);

  if (exists && !(await confirmOverwrite('Prompt', prompt.name))) return;

  addOrUpdateConfigItem(globalConfig, ConfigKey.Prompts, prompt);
  saveGlobalConfig(globalConfig);

  const workspacePromptFile = getWorkspacePromptFilePath(workspaceFolder, prompt.file);
  const globalPromptFile = getGlobalPromptFilePath(prompt.file);

  if (fs.existsSync(workspacePromptFile)) {
    ensureDirectoryExists(require('node:path').dirname(globalPromptFile));
    fs.copyFileSync(workspacePromptFile, globalPromptFile);
  }

  showCopySuccessMessage('Prompt', prompt.name, LocationScope.Global);
  void executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToGlobalCommand() {
  return registerCommand(Command.CopyPromptToGlobal, handleCopyPromptToGlobal);
}
