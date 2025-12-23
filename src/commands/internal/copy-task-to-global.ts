import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_FILE_NAME,
  GLOBAL_ITEM_PREFIX,
  getCommandId,
  getGlobalConfigDir,
  getGlobalConfigPath,
} from '../../common/constants';
import { getWorkspaceConfigFilePath } from '../../common/lib/config-manager';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas';
import type { TreeTask } from '../../views/tasks/items';

async function handleCopyTaskToGlobal(treeTask: TreeTask): Promise<void> {
  if (!treeTask || !treeTask.taskName) {
    vscode.window.showErrorMessage('Invalid task selected');
    return;
  }

  if (treeTask.taskName.startsWith(GLOBAL_ITEM_PREFIX)) {
    vscode.window.showInformationMessage('This task is already global');
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  const workspaceConfigPath = getWorkspaceConfigFilePath(workspaceFolder, CONFIG_FILE_NAME);
  if (!fs.existsSync(workspaceConfigPath)) {
    vscode.window.showErrorMessage('Workspace config not found');
    return;
  }

  const workspaceConfig = JSON5.parse(fs.readFileSync(workspaceConfigPath, 'utf8')) as PPConfig;
  const task = workspaceConfig.tasks?.find((t) => t.name === treeTask.taskName);

  if (!task) {
    vscode.window.showErrorMessage(`Task "${treeTask.taskName}" not found in workspace config`);
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

  if (!globalConfig.tasks) {
    globalConfig.tasks = [];
  }

  const existingTask = globalConfig.tasks.find((t) => t.name === task.name);
  if (existingTask) {
    const choice = await vscode.window.showWarningMessage(
      `Task "${task.name}" already exists in global config. Overwrite?`,
      'Overwrite',
      'Cancel',
    );

    if (choice !== 'Overwrite') return;

    const index = globalConfig.tasks.indexOf(existingTask);
    globalConfig.tasks[index] = task;
  } else {
    globalConfig.tasks.push(task);
  }

  fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2), 'utf8');

  vscode.window.showInformationMessage(`✓ Task "${task.name}" copied to global config`);
  void vscode.commands.executeCommand(getCommandId(Command.Refresh));
}

export function createCopyTaskToGlobalCommand() {
  return registerCommand(Command.CopyTaskToGlobal, handleCopyTaskToGlobal);
}
