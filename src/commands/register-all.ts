import type * as vscode from 'vscode';
import { Command, registerCommand } from '../common';
import type { TaskTreeDataProvider } from '../views/tasks';
import {
  createBackCmdlineCommand,
  createExecCmdlineCommand,
  createExitCmdlineCommand,
  createTabCmdlineCommand,
} from './internal/cmdline';
import { createExecuteTaskCommand } from './internal/execute-task';
import { createRevertAllReplacementsCommand } from './internal/revert-all-replacements';
import { createSelectConfigOptionCommand } from './internal/select-config-option';
import { createToggleReplacementCommand } from './internal/toggle-replacement';
import { createGoToTaskCommand } from './public/go-to-task';
import { createRefreshCommand } from './public/refresh';
import { createSwitchTaskSourceCommands } from './public/switch-task-source';

export function registerAllCommands(
  context: vscode.ExtensionContext,
  taskTreeDataProvider: TaskTreeDataProvider,
): vscode.Disposable[] {
  return [
    createRefreshCommand(taskTreeDataProvider),
    ...createSwitchTaskSourceCommands(taskTreeDataProvider),
    registerCommand(Command.ToggleGroupMode, () => taskTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleGroupModeGrouped, () => taskTreeDataProvider.toggleGroupMode()),
    createGoToTaskCommand(),
    createExecuteTaskCommand(context),
    createExecCmdlineCommand(taskTreeDataProvider),
    createExitCmdlineCommand(taskTreeDataProvider),
    createBackCmdlineCommand(taskTreeDataProvider),
    createTabCmdlineCommand(taskTreeDataProvider),
    createSelectConfigOptionCommand(),
    createToggleReplacementCommand(),
    createRevertAllReplacementsCommand(),
  ];
}
