import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { CONFIG_FILE_NAME, GLOBAL_ITEM_PREFIX, getGlobalConfigDir, getGlobalConfigPath } from '../../common/constants';
import {
  getWorkspaceConfigFilePath,
  joinConfigPath,
  loadGlobalConfig,
  loadWorkspaceConfig,
} from '../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../common/lib/vscode-utils';
import type { TreePrompt } from '../../views/prompts/items';

async function handleDeletePrompt(treePrompt: TreePrompt): Promise<void> {
  if (!treePrompt || !treePrompt.promptName) {
    vscode.window.showErrorMessage('Invalid prompt selected');
    return;
  }

  const isGlobal = treePrompt.promptName.startsWith(GLOBAL_ITEM_PREFIX);
  const promptName = isGlobal ? treePrompt.promptName.substring(GLOBAL_ITEM_PREFIX.length) : treePrompt.promptName;

  const choice = await vscode.window.showWarningMessage(
    `Are you sure you want to delete prompt "${promptName}"${isGlobal ? ' (global)' : ''}?`,
    { modal: true },
    'Delete',
  );

  if (choice !== 'Delete') return;

  if (isGlobal) {
    const globalConfig = loadGlobalConfig();
    if (!globalConfig) {
      vscode.window.showErrorMessage('Global config not found');
      return;
    }

    const globalConfigPath = getGlobalConfigPath();
    if (!globalConfig.prompts) {
      vscode.window.showErrorMessage('No prompts found in global config');
      return;
    }

    const promptIndex = globalConfig.prompts.findIndex((p) => p.name === promptName);
    if (promptIndex === -1) {
      vscode.window.showErrorMessage(`Prompt "${promptName}" not found in global config`);
      return;
    }

    const prompt = globalConfig.prompts[promptIndex];
    globalConfig.prompts.splice(promptIndex, 1);
    fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2), 'utf8');

    const globalPromptFile = path.join(getGlobalConfigDir(), prompt.file);
    if (fs.existsSync(globalPromptFile)) {
      fs.rmSync(globalPromptFile);
    }

    vscode.window.showInformationMessage(`✓ Global prompt "${promptName}" deleted`);
    void executeCommand(Command.RefreshPrompts);
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    vscode.window.showErrorMessage('Workspace config not found');
    return;
  }

  const workspaceConfigPath = getWorkspaceConfigFilePath(workspaceFolder, CONFIG_FILE_NAME);
  if (!workspaceConfig.prompts) {
    vscode.window.showErrorMessage('No prompts found in workspace config');
    return;
  }

  const promptIndex = workspaceConfig.prompts.findIndex((p) => p.name === promptName);
  if (promptIndex === -1) {
    vscode.window.showErrorMessage(`Prompt "${promptName}" not found in workspace config`);
    return;
  }

  const prompt = workspaceConfig.prompts[promptIndex];
  workspaceConfig.prompts.splice(promptIndex, 1);
  fs.writeFileSync(workspaceConfigPath, JSON.stringify(workspaceConfig, null, 2), 'utf8');

  const workspacePromptFile = joinConfigPath(workspaceFolder, prompt.file);
  if (fs.existsSync(workspacePromptFile)) {
    fs.rmSync(workspacePromptFile);
  }

  vscode.window.showInformationMessage(`✓ Prompt "${promptName}" deleted`);
  void executeCommand(Command.RefreshPrompts);
}

export function createDeletePromptCommand() {
  return registerCommand(Command.DeletePrompt, handleDeletePrompt);
}
