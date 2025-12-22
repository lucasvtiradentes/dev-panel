import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  GLOBAL_ITEM_PREFIX,
  getCommandId,
  getGlobalConfigPath,
} from '../../common/constants';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas';
import type { TreeTask } from '../../views/tasks/items';

async function handleCopyTaskToWorkspace(treeTask: TreeTask): Promise<void> {
  if (!treeTask || !treeTask.taskName) {
    vscode.window.showErrorMessage('Invalid task selected');
    return;
  }

  if (!treeTask.taskName.startsWith(GLOBAL_ITEM_PREFIX)) {
    vscode.window.showInformationMessage('This task is already in workspace');
    return;
  }

  const taskName = treeTask.taskName.substring(GLOBAL_ITEM_PREFIX.length);

  let workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  if ((vscode.workspace.workspaceFolders?.length ?? 0) > 1) {
    const folders = vscode.workspace.workspaceFolders?.map((f) => ({ label: f.name, folder: f })) ?? [];
    const selected = await vscode.window.showQuickPick(folders, {
      placeHolder: 'Select workspace to copy task to',
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
  const task = globalConfig.tasks?.find((t) => t.name === taskName);

  if (!task) {
    vscode.window.showErrorMessage(`Task "${taskName}" not found in global config`);
    return;
  }

  const workspaceConfigPath = path.join(workspaceFolder.uri.fsPath, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
  const workspaceConfigDir = path.join(workspaceFolder.uri.fsPath, CONFIG_DIR_NAME);

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

  if (!workspaceConfig.tasks) {
    workspaceConfig.tasks = [];
  }

  const existingTask = workspaceConfig.tasks.find((t) => t.name === task.name);
  if (existingTask) {
    const choice = await vscode.window.showWarningMessage(
      `Task "${task.name}" already exists in workspace. Overwrite?`,
      'Overwrite',
      'Cancel',
    );

    if (choice !== 'Overwrite') return;

    const index = workspaceConfig.tasks.indexOf(existingTask);
    workspaceConfig.tasks[index] = task;
  } else {
    workspaceConfig.tasks.push(task);
  }

  fs.writeFileSync(workspaceConfigPath, JSON.stringify(workspaceConfig, null, 2), 'utf8');

  vscode.window.showInformationMessage(`✓ Task "${task.name}" copied to workspace`);
  void vscode.commands.executeCommand(getCommandId(Command.Refresh));
}

export function createCopyTaskToWorkspaceCommand() {
  return registerCommand(Command.CopyTaskToWorkspace, handleCopyTaskToWorkspace);
}
