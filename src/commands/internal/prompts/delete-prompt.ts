import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigKey, LocationScope, getGlobalConfigDir } from '../../../common/constants';
import {
  confirmDelete,
  joinConfigPath,
  loadGlobalConfig,
  loadWorkspaceConfig,
  removeConfigItem,
  saveGlobalConfig,
  saveWorkspaceConfig,
} from '../../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../../common/lib/vscode-utils';
import type { DevPanelPrompt } from '../../../common/schemas';
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
import type { TreePrompt } from '../../../views/prompts/items';

async function handleDeletePrompt(treePrompt: TreePrompt) {
  if (!treePrompt?.promptName) {
    showInvalidItemError('prompt');
    return;
  }

  const isGlobal = isGlobalItem(treePrompt.promptName);
  const promptName = stripGlobalPrefix(treePrompt.promptName);

  if (!(await confirmDelete('prompt', promptName, isGlobal))) return;

  if (isGlobal) {
    const globalConfig = loadGlobalConfig();
    if (!globalConfig) {
      showConfigNotFoundError(LocationScope.Global);
      return;
    }

    if (!globalConfig.prompts?.length) {
      showNoItemsFoundError('prompt', LocationScope.Global);
      return;
    }

    const removed = removeConfigItem(globalConfig, ConfigKey.Prompts, promptName) as DevPanelPrompt | null;
    if (!removed) {
      showNotFoundError('Prompt', promptName, LocationScope.Global);
      return;
    }

    saveGlobalConfig(globalConfig);

    const globalPromptFile = path.join(getGlobalConfigDir(), removed.file);
    if (fs.existsSync(globalPromptFile)) {
      fs.rmSync(globalPromptFile);
    }

    showDeleteSuccessMessage('prompt', promptName, true);
    void executeCommand(Command.RefreshPrompts);
    return;
  }

  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  if (!workspaceConfig.prompts?.length) {
    showNoItemsFoundError('prompt', LocationScope.Workspace);
    return;
  }

  const removed = removeConfigItem(workspaceConfig, ConfigKey.Prompts, promptName) as DevPanelPrompt | null;
  if (!removed) {
    showNotFoundError('Prompt', promptName, LocationScope.Workspace);
    return;
  }

  saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const workspacePromptFile = joinConfigPath(workspaceFolder, removed.file);
  if (fs.existsSync(workspacePromptFile)) {
    fs.rmSync(workspacePromptFile);
  }

  showDeleteSuccessMessage('prompt', promptName, false);
  void executeCommand(Command.RefreshPrompts);
}

export function createDeletePromptCommand() {
  return registerCommand(Command.DeletePrompt, handleDeletePrompt);
}
