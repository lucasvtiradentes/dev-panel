import * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { BranchTaskItem, BranchTasksProvider } from '../../views/branch-tasks';
import { createBranchTaskCommands } from '../../views/branch-tasks/commands';

export type ToggleTodoParams = number;
export type CycleTaskStatusParams = BranchTaskItem | number;

function extractLineIndex(itemOrLineIndex: BranchTaskItem | number): number {
  return typeof itemOrLineIndex === 'number' ? itemOrLineIndex : itemOrLineIndex.node.lineIndex;
}

export function createToggleBranchTasksCommands(branchTasksProvider: BranchTasksProvider): vscode.Disposable[] {
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
      const text = await vscode.window.showInputBox({
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
    ...createBranchTaskCommands(branchTasksProvider),
  ];
}
