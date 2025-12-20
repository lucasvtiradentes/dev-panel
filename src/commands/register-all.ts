import type * as vscode from 'vscode';
import { Command, registerCommand } from '../common';
import type { BranchContextProvider } from '../views/branch-context';
import type { PromptTreeDataProvider } from '../views/prompts';
import type { ReplacementsProvider } from '../views/replacements';
import type { TaskTreeDataProvider } from '../views/tasks';
import type { TodosProvider } from '../views/todos';
import type { ToolTreeDataProvider } from '../views/tools';
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
import { createSelectConfigOptionCommand } from './internal/select-config-option';
import { createToggleReplacementCommand } from './internal/toggle-replacement';
import { createGoToTaskCommand } from './public/go-to-task';
import { createRefreshCommand, createRefreshPromptsCommand, createRefreshToolsCommand } from './public/refresh';
import { createShowLogsCommand } from './public/show-logs';
import { createSwitchTaskSourceCommands } from './public/switch-task-source';

export function registerAllCommands(
  context: vscode.ExtensionContext,
  taskTreeDataProvider: TaskTreeDataProvider,
  toolTreeDataProvider: ToolTreeDataProvider,
  promptTreeDataProvider: PromptTreeDataProvider,
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
    createGoToTaskCommand(),
    createExecuteTaskCommand(context),
    createExecCmdlineCommand(taskTreeDataProvider),
    createExitCmdlineCommand(taskTreeDataProvider),
    createBackCmdlineCommand(taskTreeDataProvider),
    createTabCmdlineCommand(taskTreeDataProvider),
    createSelectConfigOptionCommand(),
    createToggleReplacementCommand(),
    createRevertAllReplacementsCommand(),
    registerCommand(Command.RefreshReplacements, () => replacementsProvider.refresh()),
    registerCommand(Command.ToggleReplacementsGroupMode, () => replacementsProvider.toggleGroupMode()),
    registerCommand(Command.ToggleReplacementsGroupModeGrouped, () => replacementsProvider.toggleGroupMode()),
    createRefreshToolsCommand(toolTreeDataProvider),
    registerCommand(Command.ToggleToolsGroupMode, () => toolTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleToolsGroupModeGrouped, () => toolTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleToolFavorite, (item) => toolTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.ToggleToolHide, (item) => toolTreeDataProvider.toggleHide(item)),
    createExecuteToolCommand(context),
    createRefreshPromptsCommand(promptTreeDataProvider),
    registerCommand(Command.TogglePromptsGroupMode, () => promptTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.TogglePromptsGroupModeGrouped, () => promptTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.TogglePromptFavorite, (item) => promptTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.TogglePromptHide, (item) => promptTreeDataProvider.toggleHide(item)),
    createExecutePromptCommand(),
    registerCommand(Command.RefreshBranchContext, () => branchContextProvider.refresh()),
    registerCommand(Command.EditBranchPrLink, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, 'prLink', value),
    ),
    registerCommand(Command.EditBranchLinearProject, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, 'linearProject', value),
    ),
    registerCommand(Command.EditBranchLinearIssue, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, 'linearIssue', value),
    ),
    registerCommand(Command.EditBranchObjective, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, 'objective', value),
    ),
    registerCommand(Command.EditBranchNotes, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, 'notes', value),
    ),
    registerCommand(Command.EditBranchTodos, () => branchContextProvider.openMarkdownFile()),
    registerCommand(Command.OpenBranchContextFile, () => branchContextProvider.openMarkdownFile()),
    registerCommand(Command.ToggleTodo, (lineIndex: number) => todosProvider.toggleTodo(lineIndex)),
    createShowLogsCommand(),
  ];
}
