import type * as vscode from 'vscode';
import { Command, registerCommand } from '../common';
import type { TaskTreeDataProvider } from '../views/tasks';
import type { ToolTreeDataProvider } from '../views/tools';
import {
  createBackCmdlineCommand,
  createExecCmdlineCommand,
  createExitCmdlineCommand,
  createTabCmdlineCommand,
} from './internal/cmdline';
import { createExecuteTaskCommand, createExecuteToolCommand } from './internal/execute-task';
import { createRevertAllReplacementsCommand } from './internal/revert-all-replacements';
import { createSelectConfigOptionCommand } from './internal/select-config-option';
import { createToggleReplacementCommand } from './internal/toggle-replacement';
import { createGoToTaskCommand } from './public/go-to-task';
import { createRefreshCommand, createRefreshToolsCommand } from './public/refresh';
import { createSwitchTaskSourceCommands } from './public/switch-task-source';

export function registerAllCommands(
  context: vscode.ExtensionContext,
  taskTreeDataProvider: TaskTreeDataProvider,
  toolTreeDataProvider: ToolTreeDataProvider,
): vscode.Disposable[] {
  return [
    createRefreshCommand(taskTreeDataProvider),
    ...createSwitchTaskSourceCommands(taskTreeDataProvider),
    registerCommand(Command.ToggleGroupMode, () => taskTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleGroupModeGrouped, () => taskTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleFavorite, (item) => taskTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.ToggleHide, (item) => taskTreeDataProvider.toggleHide(item)),
    createGoToTaskCommand(),
    createExecuteTaskCommand(context),
    createExecCmdlineCommand(taskTreeDataProvider),
    createExitCmdlineCommand(taskTreeDataProvider),
    createBackCmdlineCommand(taskTreeDataProvider),
    createTabCmdlineCommand(taskTreeDataProvider),
    createSelectConfigOptionCommand(),
    createToggleReplacementCommand(),
    createRevertAllReplacementsCommand(),
    createRefreshToolsCommand(toolTreeDataProvider),
    registerCommand(Command.ToggleToolsGroupMode, () => toolTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleToolsGroupModeGrouped, () => toolTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleToolFavorite, (item) => toolTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.ToggleToolHide, (item) => toolTreeDataProvider.toggleHide(item)),
    createExecuteToolCommand(context),
  ];
}
