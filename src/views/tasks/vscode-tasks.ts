import * as vscode from 'vscode';
import { Command, getCommandId } from '../../common';
import { TaskSource } from '../../common/types';
import { type GroupTreeItem, TreeTask, WorkspaceTreeItem } from './items';
import { isFavorite, isHidden } from './state';

export async function getVSCodeTasks(
  grouped: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  getLowestLevel: (
    elements: Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>,
  ) => Promise<Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>>,
): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
  let tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
  tasks = tasks.filter((t) => t.source === 'Workspace');

  const taskElements: Array<WorkspaceTreeItem | TreeTask> = [];
  const taskFolders: Record<string, WorkspaceTreeItem> = {};

  for (const task of tasks) {
    if (isHidden(TaskSource.VSCode, task.name)) continue;

    const group = grouped
      ? (task as unknown as { presentationOptions?: { group?: string } }).presentationOptions?.group
      : undefined;

    const _task = new TreeTask(
      task.definition.type,
      task.name,
      vscode.TreeItemCollapsibleState.None,
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

    if (isFavorite(TaskSource.VSCode, task.name)) {
      _task.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
    } else if (!_task.iconPath) {
      _task.iconPath = new vscode.ThemeIcon('terminal');
    }

    if (!_task.hide) {
      if (_task.workspace !== null) {
        if (taskFolders[_task.workspace] === undefined) {
          const ws = new WorkspaceTreeItem(_task.workspace);
          taskFolders[_task.workspace] = ws;
          taskElements.push(ws);
        }
        await taskFolders[_task.workspace].addChildren(_task);
      } else {
        taskElements.push(_task);
      }
    }
  }

  return sortFn(await getLowestLevel(taskElements));
}
