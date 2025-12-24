import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { BranchTasksProvider } from '../../views/branch-tasks';

export function createToggleBranchTasksCommands(branchTasksProvider: BranchTasksProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.ToggleBranchTasksShowOnlyTodo, () => branchTasksProvider.toggleShowOnlyTodo()),
    registerCommand(Command.ToggleBranchTasksShowOnlyTodoActive, () => branchTasksProvider.toggleShowOnlyTodo()),
    registerCommand(Command.ToggleBranchTasksGroupMode, () => branchTasksProvider.toggleGroupMode()),
    registerCommand(Command.ToggleBranchTasksGroupModeGrouped, () => branchTasksProvider.toggleGroupMode()),
    registerCommand(Command.ToggleTodo, (lineIndex: number) => branchTasksProvider.toggleTodo(lineIndex)),
  ];
}
