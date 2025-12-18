import type * as vscode from 'vscode';
import type { TaskTreeDataProvider } from '../views/tasks';
import {
    createBackCmdlineCommand,
    createExecCmdlineCommand,
    createExitCmdlineCommand,
    createTabCmdlineCommand,
} from './internal/cmdline';
import { createExecuteTaskCommand } from './internal/execute-task';
import { createGoToTaskCommand } from './public/go-to-task';
import { createRefreshCommand } from './public/refresh';
import { createShowListCommand } from './public/show-list';
import { createUnhideCommand } from './public/unhide';

export function registerAllCommands(
    context: vscode.ExtensionContext,
    taskTreeDataProvider: TaskTreeDataProvider
): vscode.Disposable[] {
    return [
        createRefreshCommand(taskTreeDataProvider),
        createUnhideCommand(taskTreeDataProvider),
        createShowListCommand(taskTreeDataProvider),
        createGoToTaskCommand(),
        createExecuteTaskCommand(context),
        createExecCmdlineCommand(taskTreeDataProvider),
        createExitCmdlineCommand(taskTreeDataProvider),
        createBackCmdlineCommand(taskTreeDataProvider),
        createTabCmdlineCommand(taskTreeDataProvider),
    ];
}
