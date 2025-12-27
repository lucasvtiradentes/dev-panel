import { CONTEXT_VALUES, getCommandId } from '../../common/constants';
import { TaskSource } from '../../common/schemas/types';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { ExtendedTask, Task } from '../../common/vscode/vscode-types';
import { Command } from '../../common/vscode/vscode-utils';
import { type GroupTreeItem, TreeTask, WorkspaceTreeItem } from './items';
import { isFavorite, isHidden } from './state';

export async function hasVSCodeGroups(): Promise<boolean> {
  const tasks: Task[] = await VscodeHelper.fetchTasks();
  const workspaceTasks = tasks.filter((t) => t.source === 'Workspace');
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
  tasks = tasks.filter((t) => t.source === 'Workspace');

  const taskElements: Array<WorkspaceTreeItem | TreeTask> = [];
  const taskFolders: Record<string, WorkspaceTreeItem> = {};

  for (const task of tasks) {
    const hidden = isHidden(TaskSource.VSCode, task.name);
    const favorite = isFavorite(TaskSource.VSCode, task.name);
    if (hidden && !showHidden) continue;
    if (showOnlyFavorites && !favorite) continue;

    const group = grouped ? (task as ExtendedTask).presentationOptions?.group : undefined;

    const _task = new TreeTask(
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

    _task.taskName = task.name;

    if (task.detail != null) {
      _task.tooltip = task.detail;
    }

    if (hidden) {
      _task.iconPath = VscodeIcons.HiddenItem;
      _task.contextValue = CONTEXT_VALUES.TASK_HIDDEN;
    } else if (favorite) {
      _task.iconPath = VscodeIcons.FavoriteItem;
      _task.contextValue = CONTEXT_VALUES.TASK_FAVORITE;
    }

    if (!_task.hide) {
      if (_task.workspace !== null) {
        if (taskFolders[_task.workspace] === undefined) {
          const ws = new WorkspaceTreeItem(_task.workspace);
          taskFolders[_task.workspace] = ws;
          taskElements.push(ws);
        }
        taskFolders[_task.workspace].addChildren(_task);
      } else {
        taskElements.push(_task);
      }
    }
  }

  return sortFn(await getLowestLevel(taskElements));
}
