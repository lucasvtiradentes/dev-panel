import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_DIR_KEY,
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  GLOBAL_ITEM_PREFIX,
  GLOBAL_TASK_TOOLTIP,
  NO_GROUP_NAME,
  getCommandId,
  getGlobalConfigDir,
  getGlobalConfigPath,
} from '../../common/constants';
import { getWorkspaceConfigDirPath, getWorkspaceConfigFilePath } from '../../common/lib/config-manager';
import { globalTasksState } from '../../common/lib/global-state';
import { Command } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas';
import { TaskSource } from '../../common/schemas/types';
import { readPPVariablesAsEnv } from '../../common/utils/variables-env';
import { GroupTreeItem, TreeTask, type WorkspaceTreeItem } from './items';
import { getTaskKeybinding } from './keybindings-local';
import { isFavorite, isHidden } from './state';

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

    const globalTasks = readGlobalTasks();
    for (const task of globalTasks) {
      const treeTask = createGlobalTask(task, showHidden, showOnlyFavorites);
      if (treeTask) taskElements.push(treeTask);
    }

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

  const globalTasks = readGlobalTasks();
  for (const task of globalTasks) {
    const treeTask = createGlobalTask(task, showHidden, showOnlyFavorites);
    if (!treeTask) continue;

    const groupName = task.group ?? NO_GROUP_NAME;

    if (!groups[groupName]) {
      groups[groupName] = new GroupTreeItem(groupName);
      taskElements.push(groups[groupName]);
    }
    groups[groupName].children.push(treeTask);
  }

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
  const configPath = getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
  if (!fs.existsSync(configPath)) return [];
  const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
  return config.tasks ?? [];
}

function readGlobalTasks(): NonNullable<PPConfig['tasks']> {
  const configPath = getGlobalConfigPath();
  if (!fs.existsSync(configPath)) return [];
  try {
    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
    return config.tasks ?? [];
  } catch {
    return [];
  }
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

  const configDirPath = getWorkspaceConfigDirPath(folder);
  const env = readPPVariablesAsEnv(configDirPath);
  const cwd = task.useWorkspaceRoot ? folder.uri.fsPath : configDirPath;
  const shellExec = new vscode.ShellExecution(task.command, { env, cwd });
  const vsTask = new vscode.Task(
    { type: CONFIG_DIR_KEY, task: task.name },
    folder,
    task.name,
    CONFIG_DIR_KEY,
    shellExec,
  );

  vsTask.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.New,
    clear: false,
    focus: false,
    showReuseMessage: false,
  };

  const treeTask = new TreeTask(
    CONFIG_DIR_KEY,
    task.name,
    vscode.TreeItemCollapsibleState.None,
    {
      command: getCommandId(Command.ExecuteTask),
      title: 'Execute',
      arguments: [vsTask, folder, task],
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
    treeTask.contextValue = CONTEXT_VALUES.TASK_PP_HIDDEN;
  } else if (favorite) {
    treeTask.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
    treeTask.contextValue = CONTEXT_VALUES.TASK_PP_FAVORITE;
  } else {
    treeTask.contextValue = CONTEXT_VALUES.TASK_PP;
  }

  return treeTask;
}

function createGlobalTask(
  task: NonNullable<PPConfig['tasks']>[number],
  showHidden: boolean,
  showOnlyFavorites: boolean,
): TreeTask | null {
  const hidden = globalTasksState.isHidden(task.name);
  const favorite = globalTasksState.isFavorite(task.name);

  if (hidden && !showHidden) return null;
  if (showOnlyFavorites && !favorite) return null;

  const globalConfigDir = getGlobalConfigDir();
  const env = readPPVariablesAsEnv(globalConfigDir);
  const cwd = globalConfigDir;
  const shellExec = new vscode.ShellExecution(task.command, { env, cwd });

  const vsTask = new vscode.Task(
    { type: `${CONFIG_DIR_KEY}-global`, task: task.name },
    vscode.TaskScope.Global,
    task.name,
    `${CONFIG_DIR_KEY}-global`,
    shellExec,
  );

  vsTask.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.New,
    clear: false,
    focus: false,
    showReuseMessage: false,
  };

  const treeTask = new TreeTask(
    `${CONFIG_DIR_KEY}-global`,
    `${GLOBAL_ITEM_PREFIX}${task.name}`,
    vscode.TreeItemCollapsibleState.None,
    {
      command: getCommandId(Command.ExecuteTask),
      title: 'Execute',
      arguments: [vsTask, null, task],
    },
  );

  const keybinding = getTaskKeybinding(task.name);
  if (keybinding) {
    treeTask.description = keybinding;
  }

  if (task.description) {
    treeTask.tooltip = `Global: ${task.description}`;
  } else {
    treeTask.tooltip = GLOBAL_TASK_TOOLTIP;
  }

  if (hidden) {
    treeTask.iconPath = new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('disabledForeground'));
    treeTask.contextValue = CONTEXT_VALUES.TASK_PP_GLOBAL_HIDDEN;
  } else if (favorite) {
    treeTask.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
    treeTask.contextValue = CONTEXT_VALUES.TASK_PP_GLOBAL_FAVORITE;
  } else {
    treeTask.contextValue = CONTEXT_VALUES.TASK_PP_GLOBAL;
  }

  return treeTask;
}
