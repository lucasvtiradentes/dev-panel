import { CONTEXT_VALUES, VscodeTaskSource, getCommandId } from '../../common/constants';
import { TaskSource } from '../../common/schemas/types';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { ExtendedTask, Task } from '../../common/vscode/vscode-types';
import { type GroupTreeItem, TreeTask, WorkspaceTreeItem } from './items';
import { isFavorite, isHidden } from './state';

export async function hasVSCodeGroups(): Promise<boolean> {
  const tasks: Task[] = await VscodeHelper.fetchTasks();
  const workspaceTasks = tasks.filter((t) => t.source === VscodeTaskSource.Workspace);
  return workspaceTasks.some((task) => (task as ExtendedTask).presentationOptions?.group != null);
}

export async function getVSCodeTasks(options: {
  grouped: boolean;
  showHidden: boolean;
  showOnlyFavorites: boolean;
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>;
  getLowestLevel: (
    elements: Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>,
  ) => Promise<Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>>;
}): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
  const { grouped, showHidden, showOnlyFavorites, sortFn, getLowestLevel } = options;
  let tasks: Task[] = await VscodeHelper.fetchTasks();
  tasks = tasks.filter((t) => t.source === VscodeTaskSource.Workspace);

  const taskElements: Array<WorkspaceTreeItem | TreeTask> = [];
  const taskFolders: Record<string, WorkspaceTreeItem> = {};

  for (const task of tasks) {
    const hidden = isHidden(TaskSource.VSCode, task.name);
    const favorite = isFavorite(TaskSource.VSCode, task.name);
    if (hidden && !showHidden) continue;
    if (showOnlyFavorites && !favorite) continue;

    const group = grouped ? (task as ExtendedTask).presentationOptions?.group : undefined;

    const treeTask = new TreeTask(
      task.definition.type,
      task.name,
      VscodeConstants.TreeItemCollapsibleState.None,
      {
        command: getCommandId(Command.ExecuteTask),
        title: 'Execute',
        arguments: [task, task.scope],
      },
      task.scope,
      group,
    );

    treeTask.taskName = task.name;
    treeTask.taskSource = TaskSource.VSCode;

    if (task.detail != null) {
      treeTask.tooltip = task.detail;
    }

    if (hidden) {
      treeTask.iconPath = VscodeIcons.HiddenItem;
      treeTask.contextValue = CONTEXT_VALUES.TASK_HIDDEN;
    } else if (favorite) {
      treeTask.iconPath = VscodeIcons.FavoriteItem;
      treeTask.contextValue = CONTEXT_VALUES.TASK_FAVORITE;
    }

    if (!treeTask.hide) {
      if (treeTask.workspace !== null) {
        if (taskFolders[treeTask.workspace] === undefined) {
          const ws = new WorkspaceTreeItem(treeTask.workspace);
          taskFolders[treeTask.workspace] = ws;
          taskElements.push(ws);
        }
        taskFolders[treeTask.workspace].addChildren(treeTask);
      } else {
        taskElements.push(treeTask);
      }
    }
  }

  return sortFn(await getLowestLevel(taskElements));
}
