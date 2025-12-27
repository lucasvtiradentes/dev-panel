import { type ItemOrLineIndex, extractLineIndex } from '../../../common/utils/item-utils';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { BranchTasksProvider } from '../../../views/branch-tasks';
import { createSetTaskMetadataCommands } from './set-task-metadata';
import { createSetTaskPriorityCommands } from './set-task-priority';
import { createSetTaskStatusCommands } from './set-task-status';
import { createTaskExternalCommands } from './task-external';
import { createTaskMilestoneCommands } from './task-milestone';
import { createTaskOperationsCommands } from './task-operations';

export type ToggleTodoParams = number;
export type CycleTaskStatusParams = ItemOrLineIndex;

export function createToggleBranchTasksCommands(branchTasksProvider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.ToggleBranchTasksShowOnlyTodo, () => branchTasksProvider.toggleShowOnlyTodo()),
    registerCommand(Command.ToggleBranchTasksShowOnlyTodoActive, () => branchTasksProvider.toggleShowOnlyTodo()),
    registerCommand(Command.ToggleBranchTasksGroupMode, () => branchTasksProvider.toggleGroupMode()),
    registerCommand(Command.ToggleBranchTasksGroupModeGrouped, () => branchTasksProvider.toggleGroupMode()),
    registerCommand(Command.ToggleTodo, (lineIndex: ToggleTodoParams) => branchTasksProvider.toggleTodo(lineIndex)),
    registerCommand(Command.CycleTaskStatus, (itemOrLineIndex: CycleTaskStatusParams) =>
      branchTasksProvider.toggleTodo(extractLineIndex(itemOrLineIndex)),
    ),
    registerCommand(Command.AddBranchTask, async () => {
      const text = await VscodeHelper.showInputBox({
        prompt: 'Enter task text',
        placeHolder: 'New task',
      });
      if (!text) return;
      await branchTasksProvider.addRootTask(text);
    }),
    registerCommand(Command.SyncBranchTasks, async () => {
      await branchTasksProvider.syncTasks();
    }),
    registerCommand(Command.FilterBranchTasks, async () => {
      await branchTasksProvider.showFilterQuickPick();
    }),
    registerCommand(Command.FilterBranchTasksActive, async () => {
      await branchTasksProvider.showFilterQuickPick();
    }),
    ...createSetTaskStatusCommands(branchTasksProvider),
    ...createSetTaskPriorityCommands(branchTasksProvider),
    ...createSetTaskMetadataCommands(branchTasksProvider),
    ...createTaskOperationsCommands(branchTasksProvider),
    ...createTaskExternalCommands(branchTasksProvider),
    ...createTaskMilestoneCommands(branchTasksProvider),
  ];
}
