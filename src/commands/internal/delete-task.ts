import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { CONFIG_FILE_NAME } from '../../common/constants';
import { getWorkspaceConfigFilePath } from '../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas';
import type { TreeTask } from '../../views/tasks/items';

async function handleDeleteTask(treeTask: TreeTask): Promise<void> {
  if (!treeTask || !treeTask.taskName) {
    vscode.window.showErrorMessage('Invalid task selected');
    return;
  }

  const taskName = treeTask.taskName;

  const choice = await vscode.window.showWarningMessage(
    `Are you sure you want to delete task "${taskName}"?`,
    { modal: true },
    'Delete',
  );

  if (choice !== 'Delete') return;

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
  if (!workspaceConfig.tasks) {
    vscode.window.showErrorMessage('No tasks found in workspace config');
    return;
  }

  const taskIndex = workspaceConfig.tasks.findIndex((t) => t.name === taskName);
  if (taskIndex === -1) {
    vscode.window.showErrorMessage(`Task "${taskName}" not found in workspace config`);
    return;
  }

  workspaceConfig.tasks.splice(taskIndex, 1);
  fs.writeFileSync(workspaceConfigPath, JSON.stringify(workspaceConfig, null, 2), 'utf8');

  vscode.window.showInformationMessage(`✓ Task "${taskName}" deleted`);
  void executeCommand(Command.Refresh);
}

export function createDeleteTaskCommand() {
  return registerCommand(Command.DeleteTask, handleDeleteTask);
}
