import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { BranchTasksProvider } from '../../views/branch-tasks';
import { createBranchTaskCommands } from '../../views/branch-tasks/commands';

export type ToggleTodoParams = number;
export type CycleTaskStatusParams = number;

export function createToggleBranchTasksCommands(branchTasksProvider: BranchTasksProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.ToggleBranchTasksShowOnlyTodo, () => branchTasksProvider.toggleShowOnlyTodo()),
    registerCommand(Command.ToggleBranchTasksShowOnlyTodoActive, () => branchTasksProvider.toggleShowOnlyTodo()),
    registerCommand(Command.ToggleBranchTasksGroupMode, () => branchTasksProvider.toggleGroupMode()),
    registerCommand(Command.ToggleBranchTasksGroupModeGrouped, () => branchTasksProvider.toggleGroupMode()),
    registerCommand(Command.ToggleTodo, (lineIndex: ToggleTodoParams) => branchTasksProvider.toggleTodo(lineIndex)),
    registerCommand(Command.CycleTaskStatus, (lineIndex: CycleTaskStatusParams) =>
      branchTasksProvider.toggleTodo(lineIndex),
    ),
    ...createBranchTaskCommands(branchTasksProvider),
  ];
}
