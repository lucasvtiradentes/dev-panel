import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { CONFIG_FILE_NAME, GLOBAL_ITEM_PREFIX, getGlobalConfigPath, getGlobalPromptsDir } from '../../common/constants';
import { getWorkspaceConfigDirPath, getWorkspaceConfigFilePath } from '../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas';
import type { TreePrompt } from '../../views/prompts/items';

async function handleCopyPromptToWorkspace(treePrompt: TreePrompt): Promise<void> {
  if (!treePrompt || !treePrompt.promptName) {
    vscode.window.showErrorMessage('Invalid prompt selected');
    return;
  }

  if (!treePrompt.promptName.startsWith(GLOBAL_ITEM_PREFIX)) {
    vscode.window.showInformationMessage('This prompt is already in workspace');
    return;
  }

  const promptName = treePrompt.promptName.substring(GLOBAL_ITEM_PREFIX.length);

  let workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  if ((vscode.workspace.workspaceFolders?.length ?? 0) > 1) {
    const folders = vscode.workspace.workspaceFolders?.map((f) => ({ label: f.name, folder: f })) ?? [];
    const selected = await vscode.window.showQuickPick(folders, {
      placeHolder: 'Select workspace to copy prompt to',
    });

    if (!selected) return;
    workspaceFolder = selected.folder;
  }

  const globalConfigPath = getGlobalConfigPath();
  if (!fs.existsSync(globalConfigPath)) {
    vscode.window.showErrorMessage('Global config not found');
    return;
  }

  const globalConfig = JSON5.parse(fs.readFileSync(globalConfigPath, 'utf8')) as PPConfig;
  const prompt = globalConfig.prompts?.find((p) => p.name === promptName);

  if (!prompt) {
    vscode.window.showErrorMessage(`Prompt "${promptName}" not found in global config`);
    return;
  }

  const workspaceConfigPath = getWorkspaceConfigFilePath(workspaceFolder, CONFIG_FILE_NAME);
  const workspaceConfigDir = getWorkspaceConfigDirPath(workspaceFolder);

  if (!fs.existsSync(workspaceConfigDir)) {
    fs.mkdirSync(workspaceConfigDir, { recursive: true });
  }

  let workspaceConfig: PPConfig = {};
  if (fs.existsSync(workspaceConfigPath)) {
    try {
      workspaceConfig = JSON5.parse(fs.readFileSync(workspaceConfigPath, 'utf8')) as PPConfig;
    } catch (error) {
      vscode.window.showErrorMessage('Failed to read workspace config');
      return;
    }
  }

  if (!workspaceConfig.prompts) {
    workspaceConfig.prompts = [];
  }

  const existingPrompt = workspaceConfig.prompts.find((p) => p.name === prompt.name);
  if (existingPrompt) {
    const choice = await vscode.window.showWarningMessage(
      `Prompt "${prompt.name}" already exists in workspace. Overwrite?`,
      'Overwrite',
      'Cancel',
    );

    if (choice !== 'Overwrite') return;

    const index = workspaceConfig.prompts.indexOf(existingPrompt);
    workspaceConfig.prompts[index] = prompt;
  } else {
    workspaceConfig.prompts.push(prompt);
  }

  fs.writeFileSync(workspaceConfigPath, JSON.stringify(workspaceConfig, null, 2), 'utf8');

  const globalPromptFile = path.join(getGlobalPromptsDir(), prompt.file);
  const workspacePromptFile = path.join(workspaceConfigDir, prompt.file);

  if (fs.existsSync(globalPromptFile)) {
    const workspacePromptDir = path.dirname(workspacePromptFile);
    if (!fs.existsSync(workspacePromptDir)) {
      fs.mkdirSync(workspacePromptDir, { recursive: true });
    }
    fs.copyFileSync(globalPromptFile, workspacePromptFile);
  }

  vscode.window.showInformationMessage(`✓ Prompt "${prompt.name}" copied to workspace`);
  void executeCommand(Command.RefreshPrompts);
}

export function createCopyPromptToWorkspaceCommand() {
  return registerCommand(Command.CopyPromptToWorkspace, handleCopyPromptToWorkspace);
}
