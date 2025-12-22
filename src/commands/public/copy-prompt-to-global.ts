import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  GLOBAL_ITEM_PREFIX,
  getGlobalConfigDir,
  getGlobalConfigPath,
} from '../../common/constants';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas';
import type { TreePrompt } from '../../views/prompts/items';

async function handleCopyPromptToGlobal(treePrompt: TreePrompt): Promise<void> {
  if (!treePrompt || !treePrompt.promptName) {
    vscode.window.showErrorMessage('Invalid prompt selected');
    return;
  }

  if (treePrompt.promptName.startsWith(GLOBAL_ITEM_PREFIX)) {
    vscode.window.showInformationMessage('This prompt is already global');
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  const workspaceConfigPath = path.join(workspaceFolder.uri.fsPath, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
  if (!fs.existsSync(workspaceConfigPath)) {
    vscode.window.showErrorMessage('Workspace config not found');
    return;
  }

  const workspaceConfig = JSON5.parse(fs.readFileSync(workspaceConfigPath, 'utf8')) as PPConfig;
  const prompt = workspaceConfig.prompts?.find((p) => p.name === treePrompt.promptName);

  if (!prompt) {
    vscode.window.showErrorMessage(`Prompt "${treePrompt.promptName}" not found in workspace config`);
    return;
  }

  const globalConfigDir = getGlobalConfigDir();
  const globalConfigPath = getGlobalConfigPath();

  if (!fs.existsSync(globalConfigDir)) {
    fs.mkdirSync(globalConfigDir, { recursive: true });
  }

  let globalConfig: PPConfig = {};
  if (fs.existsSync(globalConfigPath)) {
    try {
      globalConfig = JSON5.parse(fs.readFileSync(globalConfigPath, 'utf8')) as PPConfig;
    } catch (error) {
      vscode.window.showErrorMessage('Failed to read global config');
      return;
    }
  }

  if (!globalConfig.prompts) {
    globalConfig.prompts = [];
  }

  const existingPrompt = globalConfig.prompts.find((p) => p.name === prompt.name);
  if (existingPrompt) {
    const choice = await vscode.window.showWarningMessage(
      `Prompt "${prompt.name}" already exists in global config. Overwrite?`,
      'Overwrite',
      'Cancel',
    );

    if (choice !== 'Overwrite') return;

    const index = globalConfig.prompts.indexOf(existingPrompt);
    globalConfig.prompts[index] = prompt;
  } else {
    globalConfig.prompts.push(prompt);
  }

  fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2), 'utf8');

  const workspacePromptFile = path.join(workspaceFolder.uri.fsPath, CONFIG_DIR_NAME, prompt.file);
  const globalPromptFile = path.join(globalConfigDir, prompt.file);

  if (fs.existsSync(workspacePromptFile)) {
    const globalPromptDir = path.dirname(globalPromptFile);
    if (!fs.existsSync(globalPromptDir)) {
      fs.mkdirSync(globalPromptDir, { recursive: true });
    }
    fs.copyFileSync(workspacePromptFile, globalPromptFile);
  }

  vscode.window.showInformationMessage(`✓ Prompt "${prompt.name}" copied to global config`);
  void vscode.commands.executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToGlobalCommand() {
  return registerCommand(Command.CopyPromptToGlobal, handleCopyPromptToGlobal);
}
