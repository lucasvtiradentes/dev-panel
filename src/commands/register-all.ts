import * as vscode from 'vscode';
import { Command, registerCommand } from '../common';
import { syncKeybindings } from '../lib/keybindings-sync';
import { BranchContextField, type BranchContextProvider } from '../views/branch-context';
import type { PromptTreeDataProvider, TreePrompt } from '../views/prompts';
import type { ReplacementsProvider } from '../views/replacements';
import type { TaskTreeDataProvider } from '../views/tasks';
import type { TodosProvider } from '../views/todos';
import type { ToolTreeDataProvider, TreeTool } from '../views/tools';
import type { VariablesProvider } from '../views/variables';
import {
  createBackCmdlineCommand,
  createExecCmdlineCommand,
  createExitCmdlineCommand,
  createTabCmdlineCommand,
} from './internal/cmdline';
import {
  createExecutePromptCommand,
  createExecuteTaskCommand,
  createExecuteToolCommand,
} from './internal/execute-task';
import { createRevertAllReplacementsCommand } from './internal/revert-all-replacements';
import { createResetConfigOptionCommand, createSelectConfigOptionCommand } from './internal/select-config-option';
import { createToggleReplacementCommand } from './internal/toggle-replacement';
import { createGoToTaskCommand } from './public/go-to-task';
import { createOpenTasksConfigCommand } from './public/open-tasks-config';
import { createRefreshCommand, createRefreshPromptsCommand, createRefreshToolsCommand } from './public/refresh';
import { createOpenToolsKeybindingsCommand, createSetToolKeybindingCommand } from './public/set-tool-keybinding';
import { createShowLogsCommand } from './public/show-logs';
import { createSwitchTaskSourceCommands } from './public/switch-task-source';

export function registerAllCommands(
  context: vscode.ExtensionContext,
  taskTreeDataProvider: TaskTreeDataProvider,
  toolTreeDataProvider: ToolTreeDataProvider,
  promptTreeDataProvider: PromptTreeDataProvider,
  variablesProvider: VariablesProvider,
  replacementsProvider: ReplacementsProvider,
  branchContextProvider: BranchContextProvider,
  todosProvider: TodosProvider,
): vscode.Disposable[] {
  return [
    createRefreshCommand(taskTreeDataProvider),
    ...createSwitchTaskSourceCommands(taskTreeDataProvider),
    registerCommand(Command.ToggleGroupMode, () => taskTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleGroupModeGrouped, () => taskTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleFavorite, (item) => taskTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.ToggleHide, (item) => taskTreeDataProvider.toggleHide(item)),
    registerCommand(Command.ToggleUnfavorite, (item) => taskTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.ToggleTasksShowHidden, () => taskTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.ToggleTasksShowHiddenActive, () => taskTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.ToggleTasksShowOnlyFavorites, () => taskTreeDataProvider.toggleShowOnlyFavorites()),
    registerCommand(Command.ToggleTasksShowOnlyFavoritesActive, () => taskTreeDataProvider.toggleShowOnlyFavorites()),
    createGoToTaskCommand(),
    createOpenTasksConfigCommand(),
    createExecuteTaskCommand(context),
    createExecCmdlineCommand(taskTreeDataProvider),
    createExitCmdlineCommand(taskTreeDataProvider),
    createBackCmdlineCommand(taskTreeDataProvider),
    createTabCmdlineCommand(taskTreeDataProvider),
    createSelectConfigOptionCommand(),
    createResetConfigOptionCommand(),
    registerCommand(Command.RefreshConfigs, () => variablesProvider.refresh()),
    registerCommand(Command.ToggleConfigsGroupMode, () => variablesProvider.toggleGroupMode()),
    registerCommand(Command.ToggleConfigsGroupModeGrouped, () => variablesProvider.toggleGroupMode()),
    createToggleReplacementCommand(),
    createRevertAllReplacementsCommand(),
    registerCommand(Command.RefreshReplacements, () => replacementsProvider.refresh()),
    registerCommand(Command.ToggleReplacementsGroupMode, () => replacementsProvider.toggleGroupMode()),
    registerCommand(Command.ToggleReplacementsGroupModeGrouped, () => replacementsProvider.toggleGroupMode()),
    createRefreshToolsCommand(toolTreeDataProvider),
    registerCommand(Command.ToggleToolsGroupMode, () => toolTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleToolsGroupModeGrouped, () => toolTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleToolFavorite, (item) => toolTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.ToggleToolUnfavorite, (item) => toolTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.ToggleToolHide, (item) => toolTreeDataProvider.toggleHide(item)),
    registerCommand(Command.ToggleToolsShowHidden, () => toolTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.ToggleToolsShowHiddenActive, () => toolTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.ToggleToolsShowOnlyFavorites, () => toolTreeDataProvider.toggleShowOnlyFavorites()),
    registerCommand(Command.ToggleToolsShowOnlyFavoritesActive, () => toolTreeDataProvider.toggleShowOnlyFavorites()),
    createExecuteToolCommand(context),
    registerCommand(Command.GoToToolFile, async (item: TreeTool) => {
      if (item?.toolFile) {
        const uri = vscode.Uri.file(item.toolFile);
        await vscode.window.showTextDocument(uri);
      }
    }),
    createRefreshPromptsCommand(promptTreeDataProvider),
    registerCommand(Command.TogglePromptsGroupMode, () => promptTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.TogglePromptsGroupModeGrouped, () => promptTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.TogglePromptFavorite, (item) => promptTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.TogglePromptUnfavorite, (item) => promptTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.TogglePromptHide, (item) => promptTreeDataProvider.toggleHide(item)),
    registerCommand(Command.TogglePromptsShowHidden, () => promptTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.TogglePromptsShowHiddenActive, () => promptTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.TogglePromptsShowOnlyFavorites, () => promptTreeDataProvider.toggleShowOnlyFavorites()),
    registerCommand(Command.TogglePromptsShowOnlyFavoritesActive, () =>
      promptTreeDataProvider.toggleShowOnlyFavorites(),
    ),
    createExecutePromptCommand(),
    registerCommand(Command.GoToPromptFile, async (item: TreePrompt) => {
      if (item?.promptFile) {
        const uri = vscode.Uri.file(item.promptFile);
        await vscode.window.showTextDocument(uri);
      }
    }),
    registerCommand(Command.RefreshBranchContext, () => branchContextProvider.refresh()),
    registerCommand(Command.EditBranchPrLink, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, BranchContextField.PrLink, value),
    ),
    registerCommand(Command.EditBranchLinearLink, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, BranchContextField.LinearLink, value),
    ),
    registerCommand(Command.EditBranchObjective, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, BranchContextField.Objective, value),
    ),
    registerCommand(Command.EditBranchNotes, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, BranchContextField.Notes, value),
    ),
    registerCommand(Command.EditBranchTodos, () => branchContextProvider.openMarkdownFileAtLine('TODO')),
    registerCommand(Command.OpenBranchContextFile, () => branchContextProvider.openMarkdownFile()),
    registerCommand(Command.ToggleTodo, (lineIndex: number) => todosProvider.toggleTodo(lineIndex)),
    createShowLogsCommand(),
    registerCommand(Command.SyncToolKeybindings, () => syncKeybindings()),
    createSetToolKeybindingCommand(),
    createOpenToolsKeybindingsCommand(),
  ];
}
