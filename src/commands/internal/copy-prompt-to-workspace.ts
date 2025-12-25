import * as fs from 'node:fs';
import * as path from 'node:path';
import { getGlobalPromptsDir } from '../../common/constants';
import {
  addOrUpdateConfigItem,
  confirmOverwrite,
  ensureDirectoryExists,
  getWorkspaceConfigDirPath,
  loadGlobalConfig,
  loadWorkspaceConfig,
  saveWorkspaceConfig,
} from '../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../common/lib/vscode-utils';
import {
  isGlobalItem,
  showAlreadyWorkspaceMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../common/utils/item-utils';
import { selectWorkspaceFolder } from '../../common/utils/workspace-utils';
import type { TreePrompt } from '../../views/prompts/items';

async function handleCopyPromptToWorkspace(treePrompt: TreePrompt): Promise<void> {
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
    showConfigNotFoundError('global');
    return;
  }

  const prompt = globalConfig.prompts?.find((p) => p.name === promptName);
  if (!prompt) {
    showNotFoundError('Prompt', promptName, 'global');
    return;
  }

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder) ?? {};
  const exists = workspaceConfig.prompts?.some((p) => p.name === prompt.name);

  if (exists && !(await confirmOverwrite('Prompt', prompt.name))) return;

  addOrUpdateConfigItem(workspaceConfig, 'prompts', prompt);
  saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const globalPromptFile = path.join(getGlobalPromptsDir(), prompt.file);
  const workspaceConfigDir = getWorkspaceConfigDirPath(workspaceFolder);
  const workspacePromptFile = path.join(workspaceConfigDir, prompt.file);

  if (fs.existsSync(globalPromptFile)) {
    ensureDirectoryExists(path.dirname(workspacePromptFile));
    fs.copyFileSync(globalPromptFile, workspacePromptFile);
  }

  showCopySuccessMessage('Prompt', prompt.name, 'workspace');
  void executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToWorkspaceCommand() {
  return registerCommand(Command.CopyPromptToWorkspace, handleCopyPromptToWorkspace);
}
