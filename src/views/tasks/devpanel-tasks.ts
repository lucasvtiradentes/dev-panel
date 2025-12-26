import * as vscode from 'vscode';
import {
  CONFIG_DIR_KEY,
  CONTEXT_VALUES,
  GLOBAL_ITEM_PREFIX,
  GLOBAL_TASK_TOOLTIP,
  NO_GROUP_NAME,
  getCommandId,
  getGlobalConfigDir,
} from '../../common/constants';
import { getWorkspaceConfigDirPath, loadGlobalConfig, loadWorkspaceConfig } from '../../common/lib/config-manager';
import { globalTasksState } from '../../common/lib/global-state';
import { Command } from '../../common/lib/vscode-utils';
import type { DevPanelConfig } from '../../common/schemas';
import { TaskSource } from '../../common/schemas/types';
import { readDevPanelVariablesAsEnv } from '../../common/utils/variables-env';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { WorkspaceFolder } from '../../common/vscode/vscode-types';
import { GroupTreeItem, TreeTask, type WorkspaceTreeItem } from './items';
import { isFavorite, isHidden } from './state';

export function hasDevPanelGroups(): boolean {
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    const tasks = readDevPanelTasks(folder);
    if (tasks.some((task) => task.group != null)) return true;
  }
  return false;
}

export async function getDevPanelTasks(
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
      const tasks = readDevPanelTasks(folder);
      for (const taskItem of tasks) {
        const treeTask = createDevPanelTask(taskItem, folder, showHidden, showOnlyFavorites);
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
    const tasks = readDevPanelTasks(folder);
    for (const taskItem of tasks) {
      const treeTask = createDevPanelTask(taskItem, folder, showHidden, showOnlyFavorites);
      if (!treeTask) continue;

      const groupName = taskItem.group ?? NO_GROUP_NAME;

      if (!groups[groupName]) {
        groups[groupName] = new GroupTreeItem(groupName);
        taskElements.push(groups[groupName]);
      }
      groups[groupName].children.push(treeTask);
    }
  }

  return sortFn(taskElements);
}

function readDevPanelTasks(folder: WorkspaceFolder): NonNullable<DevPanelConfig['tasks']> {
  const config = loadWorkspaceConfig(folder);
  return config?.tasks ?? [];
}

function readGlobalTasks(): NonNullable<DevPanelConfig['tasks']> {
  const config = loadGlobalConfig();
  return config?.tasks ?? [];
}

function createDevPanelTask(
  task: NonNullable<DevPanelConfig['tasks']>[number],
  folder: WorkspaceFolder,
  showHidden: boolean,
  showOnlyFavorites: boolean,
): TreeTask | null {
  const hidden = isHidden(TaskSource.DevPanel, task.name);
  const favorite = isFavorite(TaskSource.DevPanel, task.name);
  if (hidden && !showHidden) return null;
  if (showOnlyFavorites && !favorite) return null;

  const configDirPath = getWorkspaceConfigDirPath(folder);
  const env = readDevPanelVariablesAsEnv(configDirPath);
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

  if (task.description) {
    treeTask.tooltip = task.description;
  }

  if (hidden) {
    treeTask.iconPath = VscodeIcons.HiddenItem;
    treeTask.contextValue = CONTEXT_VALUES.TASK_DEVPANEL_HIDDEN;
  } else if (favorite) {
    treeTask.iconPath = VscodeIcons.FavoriteItem;
    treeTask.contextValue = CONTEXT_VALUES.TASK_DEVPANEL_FAVORITE;
  } else {
    treeTask.contextValue = CONTEXT_VALUES.TASK_DEVPANEL;
  }

  return treeTask;
}

function createGlobalTask(
  task: NonNullable<DevPanelConfig['tasks']>[number],
  showHidden: boolean,
  showOnlyFavorites: boolean,
): TreeTask | null {
  const hidden = globalTasksState.isHidden(task.name);
  const favorite = globalTasksState.isFavorite(task.name);

  if (hidden && !showHidden) return null;
  if (showOnlyFavorites && !favorite) return null;

  const globalConfigDir = getGlobalConfigDir();
  const env = readDevPanelVariablesAsEnv(globalConfigDir);
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

  if (task.description) {
    treeTask.tooltip = `Global: ${task.description}`;
  } else {
    treeTask.tooltip = GLOBAL_TASK_TOOLTIP;
  }

  if (hidden) {
    treeTask.iconPath = VscodeIcons.HiddenItem;
    treeTask.contextValue = CONTEXT_VALUES.TASK_DEVPANEL_GLOBAL_HIDDEN;
  } else if (favorite) {
    treeTask.iconPath = VscodeIcons.FavoriteItem;
    treeTask.contextValue = CONTEXT_VALUES.TASK_DEVPANEL_GLOBAL_FAVORITE;
  } else {
    treeTask.contextValue = CONTEXT_VALUES.TASK_DEVPANEL_GLOBAL;
  }

  return treeTask;
}
