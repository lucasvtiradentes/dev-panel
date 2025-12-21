import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Command, getCommandId } from '../../common';
import {
  CONFIG_DIR_KEY,
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  NO_GROUP_NAME,
  VARIABLES_FILE_NAME,
} from '../../common/constants';
import { type PPConfig, TaskSource } from '../../common/schemas/types';
import { GroupTreeItem, TreeTask, type WorkspaceTreeItem } from './items';
import { getTaskKeybinding } from './keybindings-local';
import { isFavorite, isHidden } from './state';

function readPPVariablesAsEnv(folder: vscode.WorkspaceFolder): Record<string, string> {
  const variablesPath = `${folder.uri.fsPath}/${CONFIG_DIR_NAME}/${VARIABLES_FILE_NAME}`;
  if (!fs.existsSync(variablesPath)) return {};
  try {
    const variablesContent = fs.readFileSync(variablesPath, 'utf8');
    const variables = JSON5.parse(variablesContent) as Record<string, unknown>;
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      env[key.toUpperCase()] = stringValue;
    }
    return env;
  } catch {
    return {};
  }
}

export function hasPPGroups(): boolean {
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    const tasks = readPPTasks(folder);
    if (tasks.some((task) => task.group != null)) return true;
  }
  return false;
}

export async function getPPTasks(
  grouped: boolean,
  showHidden: boolean,
  showOnlyFavorites: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
  const folders = vscode.workspace.workspaceFolders ?? [];

  if (!grouped) {
    const taskElements: TreeTask[] = [];
    for (const folder of folders) {
      const tasks = readPPTasks(folder);
      for (const task of tasks) {
        const treeTask = createPPTask(task, folder, showHidden, showOnlyFavorites);
        if (treeTask) taskElements.push(treeTask);
      }
    }
    return sortFn(taskElements);
  }

  const taskElements: Array<TreeTask | GroupTreeItem> = [];
  const groups: Record<string, GroupTreeItem> = {};

  for (const folder of folders) {
    const tasks = readPPTasks(folder);
    for (const task of tasks) {
      const treeTask = createPPTask(task, folder, showHidden, showOnlyFavorites);
      if (!treeTask) continue;

      const groupName = task.group ?? NO_GROUP_NAME;

      if (!groups[groupName]) {
        groups[groupName] = new GroupTreeItem(groupName);
        taskElements.push(groups[groupName]);
      }
      groups[groupName].children.push(treeTask);
    }
  }

  return sortFn(taskElements);
}

function readPPTasks(folder: vscode.WorkspaceFolder): NonNullable<PPConfig['tasks']> {
  const configPath = `${folder.uri.fsPath}/${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME}`;
  if (!fs.existsSync(configPath)) return [];
  const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
  return config.tasks ?? [];
}

function createPPTask(
  task: NonNullable<PPConfig['tasks']>[number],
  folder: vscode.WorkspaceFolder,
  showHidden: boolean,
  showOnlyFavorites: boolean,
): TreeTask | null {
  const hidden = isHidden(TaskSource.PP, task.name);
  const favorite = isFavorite(TaskSource.PP, task.name);
  if (hidden && !showHidden) return null;
  if (showOnlyFavorites && !favorite) return null;

  const env = readPPVariablesAsEnv(folder);
  const shellExec = new vscode.ShellExecution(task.command, { env });
  const vsTask = new vscode.Task({ type: CONFIG_DIR_KEY }, folder, task.name, CONFIG_DIR_KEY, shellExec);

  const treeTask = new TreeTask(
    CONFIG_DIR_KEY,
    task.name,
    vscode.TreeItemCollapsibleState.None,
    {
      command: getCommandId(Command.ExecuteTask),
      title: 'Execute',
      arguments: [vsTask, folder],
    },
    folder,
  );

  const keybinding = getTaskKeybinding(task.name);
  if (keybinding) {
    treeTask.description = keybinding;
  }

  if (task.description) {
    treeTask.tooltip = task.description;
  }

  if (hidden) {
    treeTask.iconPath = new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('disabledForeground'));
    treeTask.contextValue = CONTEXT_VALUES.TASK_HIDDEN;
  } else if (favorite) {
    treeTask.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
    treeTask.contextValue = CONTEXT_VALUES.TASK_FAVORITE;
  }

  return treeTask;
}
