import * as vscode from 'vscode';
import { GLOBAL_ITEM_PREFIX, TOOLS_DIR, TOOL_INSTRUCTIONS_FILE, getGlobalConfigDir } from '../common/constants';
import { joinConfigPath } from '../common/lib/config-manager';
import { syncKeybindings } from '../common/lib/keybindings-sync';
import { Command, registerCommand } from '../common/lib/vscode-utils';
import { createOpenSettingsMenuCommand } from '../status-bar/status-bar-actions';
import { BranchContextField, type BranchContextProvider } from '../views/branch-context';
import type { BranchTasksProvider } from '../views/branch-tasks';
import type { PromptTreeDataProvider, TreePrompt } from '../views/prompts';
import type { ReplacementsProvider } from '../views/replacements';
import type { TaskTreeDataProvider } from '../views/tasks';
import type { ToolTreeDataProvider, TreeTool } from '../views/tools';
import type { VariablesProvider } from '../views/variables';
import {
  createExecutePromptCommand,
  createExecuteTaskCommand,
  createExecuteToolCommand,
} from './internal/execute-task';
import { createRevertAllReplacementsCommand } from './internal/revert-all-replacements';
import { createResetConfigOptionCommand, createSelectConfigOptionCommand } from './internal/select-config-option';
import { createToggleReplacementCommand } from './internal/toggle-replacement';
import { createAddPromptCommand } from './public/add-prompt';
import { createAddToolCommand } from './public/add-tool';
import { createCopyPromptToGlobalCommand } from './public/copy-prompt-to-global';
import { createCopyPromptToWorkspaceCommand } from './public/copy-prompt-to-workspace';
import { createCopyTaskToGlobalCommand } from './public/copy-task-to-global';
import { createCopyTaskToWorkspaceCommand } from './public/copy-task-to-workspace';
import { createCopyToolToGlobalCommand } from './public/copy-tool-to-global';
import { createCopyToolToWorkspaceCommand } from './public/copy-tool-to-workspace';
import { createDeletePromptCommand } from './public/delete-prompt';
import { createDeleteTaskCommand } from './public/delete-task';
import { createDeleteToolCommand } from './public/delete-tool';
import { createGenerateToolsDocsCommand } from './public/generate-tools-docs';
import { createGoToTaskCommand } from './public/go-to-task';
import { createOpenTasksConfigCommand } from './public/open-tasks-config';
import { createRefreshCommand } from './public/refresh';
import { createOpenPromptsKeybindingsCommand, createSetPromptKeybindingCommand } from './public/set-prompt-keybinding';
import {
  createOpenReplacementsKeybindingsCommand,
  createSetReplacementKeybindingCommand,
} from './public/set-replacement-keybinding';
import { createOpenTasksKeybindingsCommand, createSetTaskKeybindingCommand } from './public/set-task-keybinding';
import {
  createOpenVariablesKeybindingsCommand,
  createSetVariableKeybindingCommand,
} from './public/set-variable-keybinding';
import { createShowLogsCommand } from './public/show-logs';
import { createSwitchTaskSourceCommands } from './public/switch-task-source';

export function registerAllCommands(options: {
  context: vscode.ExtensionContext;
  taskTreeDataProvider: TaskTreeDataProvider;
  toolTreeDataProvider: ToolTreeDataProvider;
  promptTreeDataProvider: PromptTreeDataProvider;
  variablesProvider: VariablesProvider;
  replacementsProvider: ReplacementsProvider;
  branchContextProvider: BranchContextProvider;
  branchTasksProvider: BranchTasksProvider;
}): vscode.Disposable[] {
  const {
    context,
    taskTreeDataProvider,
    toolTreeDataProvider,
    promptTreeDataProvider,
    variablesProvider,
    replacementsProvider,
    branchContextProvider,
    branchTasksProvider,
  } = options;
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
    createDeleteTaskCommand(),
    createCopyTaskToGlobalCommand(),
    createCopyTaskToWorkspaceCommand(),
    createExecuteTaskCommand(context),
    createOpenSettingsMenuCommand(),
    createSelectConfigOptionCommand(),
    createResetConfigOptionCommand(),
    registerCommand(Command.ToggleConfigsGroupMode, () => variablesProvider.toggleGroupMode()),
    registerCommand(Command.ToggleConfigsGroupModeGrouped, () => variablesProvider.toggleGroupMode()),
    createToggleReplacementCommand(),
    createRevertAllReplacementsCommand(),
    registerCommand(Command.ToggleReplacementsGroupMode, () => replacementsProvider.toggleGroupMode()),
    registerCommand(Command.ToggleReplacementsGroupModeGrouped, () => replacementsProvider.toggleGroupMode()),
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
      if (item?.toolName) {
        const isGlobal = item.toolName.startsWith(GLOBAL_ITEM_PREFIX);
        const toolName = isGlobal ? item.toolName.substring(GLOBAL_ITEM_PREFIX.length) : item.toolName;

        let instructionsPath: string;
        if (isGlobal) {
          const globalConfigDir = getGlobalConfigDir();
          instructionsPath = `${globalConfigDir}/${TOOLS_DIR}/${toolName}/${TOOL_INSTRUCTIONS_FILE}`;
        } else {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) return;
          instructionsPath = joinConfigPath(workspaceFolder, TOOLS_DIR, toolName, TOOL_INSTRUCTIONS_FILE);
        }

        const uri = vscode.Uri.file(instructionsPath);
        await vscode.window.showTextDocument(uri);
      }
    }),
    createGenerateToolsDocsCommand(),
    createAddToolCommand(),
    createCopyToolToGlobalCommand(),
    createCopyToolToWorkspaceCommand(),
    createDeleteToolCommand(),
    registerCommand(Command.RefreshTools, () => toolTreeDataProvider.refresh()),
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
    createAddPromptCommand(),
    createCopyPromptToGlobalCommand(),
    createCopyPromptToWorkspaceCommand(),
    createDeletePromptCommand(),
    registerCommand(Command.RefreshPrompts, () => promptTreeDataProvider.refresh()),
    registerCommand(Command.GoToPromptFile, async (item: TreePrompt) => {
      if (item?.promptFile) {
        const uri = vscode.Uri.file(item.promptFile);
        await vscode.window.showTextDocument(uri);
      }
    }),
    registerCommand(Command.EditBranchPrLink, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, BranchContextField.PrLink, value),
    ),
    registerCommand(Command.EditBranchLinearLink, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, BranchContextField.LinearLink, value),
    ),
    registerCommand(Command.EditBranchObjective, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, BranchContextField.Objective, value),
    ),
    registerCommand(Command.EditBranchRequirements, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, BranchContextField.Requirements, value),
    ),
    registerCommand(Command.EditBranchNotes, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, BranchContextField.Notes, value),
    ),
    registerCommand(Command.EditBranchTodos, () => branchContextProvider.openMarkdownFileAtLine('TASKS')),
    registerCommand(Command.OpenBranchContextFile, () => branchContextProvider.openMarkdownFile()),
    registerCommand(Command.RefreshChangedFiles, () => branchContextProvider.refreshChangedFiles()),
    registerCommand(Command.ToggleTodo, (lineIndex: number) => branchTasksProvider.toggleTodo(lineIndex)),
    registerCommand(Command.ToggleBranchTasksShowOnlyTodo, () => branchTasksProvider.toggleShowOnlyTodo()),
    registerCommand(Command.ToggleBranchTasksShowOnlyTodoActive, () => branchTasksProvider.toggleShowOnlyTodo()),
    createShowLogsCommand(),
    registerCommand(Command.SyncPromptKeybindings, () => syncKeybindings()),
    createSetPromptKeybindingCommand(),
    createOpenPromptsKeybindingsCommand(),
    registerCommand(Command.SyncReplacementKeybindings, () => syncKeybindings()),
    createSetReplacementKeybindingCommand(),
    createOpenReplacementsKeybindingsCommand(),
    registerCommand(Command.SyncVariableKeybindings, () => syncKeybindings()),
    createSetVariableKeybindingCommand(),
    createOpenVariablesKeybindingsCommand(),
    registerCommand(Command.SyncTaskKeybindings, () => syncKeybindings()),
    createSetTaskKeybindingCommand(),
    createOpenTasksKeybindingsCommand(),
  ];
}
