import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { CONFIG_FILE_NAME } from '../common/constants';
import { getBranchContextTemplatePath, getConfigFilePathFromWorkspacePath } from '../common/lib/config-manager';
import { syncKeybindings } from '../common/lib/keybindings-sync';
import { Command, registerCommand } from '../common/lib/vscode-utils';
import type { PPConfig } from '../common/schemas/config-schema';
import { createOpenSettingsMenuCommand } from '../status-bar/status-bar-actions';
import type { BranchContextProvider } from '../views/branch-context';
import { validateBranchContext } from '../views/branch-context/config-validator';
import type { BranchTasksProvider } from '../views/branch-tasks';
import type { PromptTreeDataProvider } from '../views/prompts';
import type { ReplacementsProvider } from '../views/replacements';
import type { TaskTreeDataProvider } from '../views/tasks';
import type { ToolTreeDataProvider } from '../views/tools';
import type { VariablesProvider } from '../views/variables';
import { createAddPromptCommand } from './internal/add-prompt';
import { createAddToolCommand } from './internal/add-tool';
import { createCopyPromptToGlobalCommand } from './internal/copy-prompt-to-global';
import { createCopyPromptToWorkspaceCommand } from './internal/copy-prompt-to-workspace';
import { createCopyTaskToGlobalCommand } from './internal/copy-task-to-global';
import { createCopyTaskToWorkspaceCommand } from './internal/copy-task-to-workspace';
import { createCopyToolToGlobalCommand } from './internal/copy-tool-to-global';
import { createCopyToolToWorkspaceCommand } from './internal/copy-tool-to-workspace';
import { createDeletePromptCommand } from './internal/delete-prompt';
import { createDeleteTaskCommand } from './internal/delete-task';
import { createDeleteToolCommand } from './internal/delete-tool';
import { createEditBranchFieldsCommands } from './internal/edit-branch-fields';
import {
  createExecutePromptCommand,
  createExecuteTaskCommand,
  createExecuteToolCommand,
} from './internal/execute-task';
import { createGenerateToolsDocsCommand } from './internal/generate-tools-docs';
import { createGoToPromptFileCommand } from './internal/go-to-prompt-file';
import { createGoToReplacementTargetFileCommand } from './internal/go-to-replacement-target-file';
import { createGoToTaskCommand } from './internal/go-to-task';
import { createGoToToolFileCommand } from './internal/go-to-tool-file';
import { createOpenBranchContextFileCommand } from './internal/open-branch-context-file';
import { createOpenTasksConfigCommand } from './internal/open-tasks-config';
import { createOpenVariablesConfigCommand } from './internal/open-variables-config';
import { createRefreshCommand } from './internal/refresh';
import { createResetConfigOptionCommand, createSelectConfigOptionCommand } from './internal/select-config-option';
import {
  createOpenPromptsKeybindingsCommand,
  createSetPromptKeybindingCommand,
} from './internal/set-prompt-keybinding';
import { createOpenTasksKeybindingsCommand, createSetTaskKeybindingCommand } from './internal/set-task-keybinding';
import {
  createOpenVariablesKeybindingsCommand,
  createSetVariableKeybindingCommand,
} from './internal/set-variable-keybinding';
import { createSwitchTaskSourceCommands } from './internal/switch-task-source';
import { createSyncBranchContextCommand } from './internal/sync-branch-context';
import {
  createToggleAllReplacementsActivateCommand,
  createToggleAllReplacementsDeactivateCommand,
} from './internal/toggle-all-replacements';
import { createToggleBranchContextHideEmptySectionsCommand } from './internal/toggle-branch-context-hide-empty-sections';
import { createToggleBranchTasksCommands } from './internal/toggle-branch-tasks';
import { createToggleBranchTypeCommand } from './internal/toggle-branch-type';
import { createTogglePromptsViewCommands } from './internal/toggle-prompts-view';
import { createToggleReplacementCommand } from './internal/toggle-replacement';
import { createToggleReplacementsViewCommands } from './internal/toggle-replacements-view';
import { createToggleTasksViewCommands } from './internal/toggle-tasks-view';
import { createToggleToolsViewCommands } from './internal/toggle-tools-view';
import { createToggleVariablesViewCommands } from './internal/toggle-variables-view';
import { createShowLogsCommand } from './public/show-logs';

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
    ...createToggleTasksViewCommands(taskTreeDataProvider),
    createGoToTaskCommand(),
    createOpenTasksConfigCommand(),
    createDeleteTaskCommand(),
    createCopyTaskToGlobalCommand(),
    createCopyTaskToWorkspaceCommand(),
    createExecuteTaskCommand(context),
    createOpenSettingsMenuCommand(),
    createSelectConfigOptionCommand(),
    createResetConfigOptionCommand(),
    ...createToggleVariablesViewCommands(variablesProvider),
    createToggleReplacementCommand(),
    createToggleAllReplacementsActivateCommand(),
    createToggleAllReplacementsDeactivateCommand(),
    ...createToggleReplacementsViewCommands(replacementsProvider),
    createGoToReplacementTargetFileCommand(),
    ...createToggleToolsViewCommands(toolTreeDataProvider),
    createExecuteToolCommand(context),
    createGoToToolFileCommand(),
    createGenerateToolsDocsCommand(),
    createAddToolCommand(),
    createCopyToolToGlobalCommand(),
    createCopyToolToWorkspaceCommand(),
    createDeleteToolCommand(),
    ...createTogglePromptsViewCommands(promptTreeDataProvider),
    createExecutePromptCommand(),
    createAddPromptCommand(),
    createCopyPromptToGlobalCommand(),
    createCopyPromptToWorkspaceCommand(),
    createDeletePromptCommand(),
    createGoToPromptFileCommand(),
    ...createEditBranchFieldsCommands(branchContextProvider),
    createOpenBranchContextFileCommand(branchContextProvider),
    createSyncBranchContextCommand(branchContextProvider),
    createToggleBranchTypeCommand(branchContextProvider),
    ...createToggleBranchContextHideEmptySectionsCommand(branchContextProvider),
    ...createToggleBranchTasksCommands(branchTasksProvider),
    createShowLogsCommand(),
    registerCommand(Command.SyncPromptKeybindings, () => syncKeybindings()),
    createSetPromptKeybindingCommand(),
    createOpenPromptsKeybindingsCommand(),
    registerCommand(Command.SyncVariableKeybindings, () => syncKeybindings()),
    createSetVariableKeybindingCommand(),
    createOpenVariablesKeybindingsCommand(),
    createOpenVariablesConfigCommand(),
    registerCommand(Command.SyncTaskKeybindings, () => syncKeybindings()),
    createSetTaskKeybindingCommand(),
    createOpenTasksKeybindingsCommand(),
    registerCommand(Command.ShowBranchContextValidation, async () => {
      const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspace) return;

      const configPath = getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
      if (!fs.existsSync(configPath)) {
        await vscode.window.showInformationMessage('No config file found');
        return;
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON5.parse(configContent) as PPConfig;
      const issues = validateBranchContext(workspace, config.branchContext);

      if (issues.length === 0) {
        await vscode.window.showInformationMessage('No validation issues found');
        return;
      }

      const items = issues.map((issue) => ({
        label: issue.section,
        description: issue.message,
        detail: `Severity: ${issue.severity}`,
        issue,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an issue to view details',
      });

      if (selected) {
        const configUri = vscode.Uri.file(configPath);
        const templatePath = getBranchContextTemplatePath(workspace);
        const templateUri = vscode.Uri.file(templatePath);

        await vscode.commands.executeCommand('vscode.open', configUri, vscode.ViewColumn.One);
        await vscode.commands.executeCommand('vscode.open', templateUri, vscode.ViewColumn.Two);
      }
    }),
  ];
}
