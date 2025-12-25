import * as fs from 'node:fs';
import * as path from 'node:path';
import { getGlobalConfigDir } from '../../common/constants';
import {
  addOrUpdateConfigItem,
  confirmOverwrite,
  ensureDirectoryExists,
  joinConfigPath,
  loadGlobalConfig,
  loadWorkspaceConfig,
  saveGlobalConfig,
} from '../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../common/lib/vscode-utils';
import {
  isGlobalItem,
  showAlreadyGlobalMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
} from '../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../common/utils/workspace-utils';
import type { TreePrompt } from '../../views/prompts/items';

async function handleCopyPromptToGlobal(treePrompt: TreePrompt): Promise<void> {
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
    showConfigNotFoundError('workspace');
    return;
  }

  const prompt = workspaceConfig.prompts?.find((p) => p.name === treePrompt.promptName);
  if (!prompt) {
    showNotFoundError('Prompt', treePrompt.promptName, 'workspace');
    return;
  }

  const globalConfig = loadGlobalConfig() ?? {};
  const exists = globalConfig.prompts?.some((p) => p.name === prompt.name);

  if (exists && !(await confirmOverwrite('Prompt', prompt.name))) return;

  addOrUpdateConfigItem(globalConfig, 'prompts', prompt);
  saveGlobalConfig(globalConfig);

  const globalConfigDir = getGlobalConfigDir();
  const workspacePromptFile = joinConfigPath(workspaceFolder, prompt.file);
  const globalPromptFile = path.join(globalConfigDir, prompt.file);

  if (fs.existsSync(workspacePromptFile)) {
    ensureDirectoryExists(path.dirname(globalPromptFile));
    fs.copyFileSync(workspacePromptFile, globalPromptFile);
  }

  showCopySuccessMessage('Prompt', prompt.name, 'global');
  void executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToGlobalCommand() {
  return registerCommand(Command.CopyPromptToGlobal, handleCopyPromptToGlobal);
}
