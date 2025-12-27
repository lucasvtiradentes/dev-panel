import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { CONFIG_FILE_NAME } from '../common/constants';
import {
  getBranchContextTemplatePath,
  getConfigFilePathFromWorkspacePath,
  parseConfig,
} from '../common/lib/config-manager';
import { syncKeybindings } from '../common/lib/keybindings-sync';
import { Command, registerCommand } from '../common/lib/vscode-utils';
import { getFirstWorkspacePath } from '../common/utils/workspace-utils';
import { ToastKind, VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, ExtensionContext } from '../common/vscode/vscode-types';
import { createOpenSettingsMenuCommand } from '../status-bar/status-bar-actions';
import type { BranchContextProvider } from '../views/branch-context';
import { validateBranchContext } from '../views/branch-context/config-validator';
import type { BranchTasksProvider } from '../views/branch-tasks';
import type { PromptTreeDataProvider } from '../views/prompts';
import type { ReplacementsProvider } from '../views/replacements';
import type { TaskTreeDataProvider } from '../views/tasks';
import type { ToolTreeDataProvider } from '../views/tools';
import type { VariablesProvider } from '../views/variables';
import { createEditBranchFieldsCommands } from './internal/branch-context/edit-branch-fields';
import { createOpenBranchContextFileCommand } from './internal/branch-context/open-branch-context-file';
import { createSyncBranchContextCommand } from './internal/branch-context/sync-branch-context';
import { createToggleBranchContextHideEmptySectionsCommand } from './internal/branch-context/toggle-branch-context-hide-empty-sections';
import { createToggleBranchTasksCommands } from './internal/branch-tasks/toggle-branch-tasks';
import {
  createExecutePromptCommand,
  createExecuteTaskCommand,
  createExecuteToolCommand,
} from './internal/execute-task';
import { createAddPromptCommand } from './internal/prompts/add-prompt';
import { createCopyPromptToGlobalCommand } from './internal/prompts/copy-prompt-to-global';
import { createCopyPromptToWorkspaceCommand } from './internal/prompts/copy-prompt-to-workspace';
import { createDeletePromptCommand } from './internal/prompts/delete-prompt';
import { createGoToPromptFileCommand } from './internal/prompts/go-to-prompt-file';
import { createRefreshPromptsCommand } from './internal/prompts/refresh-prompts';
import {
  createOpenPromptsKeybindingsCommand,
  createSetPromptKeybindingCommand,
} from './internal/prompts/set-prompt-keybinding';
import { createTogglePromptsViewCommands } from './internal/prompts/toggle-prompts-view';
import { createGoToReplacementTargetFileCommand } from './internal/replacements/go-to-replacement-target-file';
import {
  createToggleAllReplacementsActivateCommand,
  createToggleAllReplacementsDeactivateCommand,
} from './internal/replacements/toggle-all-replacements';
import { createToggleReplacementCommand } from './internal/replacements/toggle-replacement';
import { createToggleReplacementsViewCommands } from './internal/replacements/toggle-replacements-view';
import { createResetConfigOptionCommand, createSelectConfigOptionCommand } from './internal/select-config-option';
import { createCopyTaskToGlobalCommand } from './internal/tasks/copy-task-to-global';
import { createCopyTaskToWorkspaceCommand } from './internal/tasks/copy-task-to-workspace';
import { createDeleteTaskCommand } from './internal/tasks/delete-task';
import { createGoToTaskCommand } from './internal/tasks/go-to-task';
import { createOpenTasksConfigCommand } from './internal/tasks/open-tasks-config';
import { createRefreshCommand } from './internal/tasks/refresh-tasks';
import {
  createOpenTasksKeybindingsCommand,
  createSetTaskKeybindingCommand,
} from './internal/tasks/set-task-keybinding';
import { createSwitchTaskSourceCommands } from './internal/tasks/switch-task-source';
import { createToggleTasksViewCommands } from './internal/tasks/toggle-tasks-view';
import { createAddToolCommand } from './internal/tools/add-tool';
import { createCopyToolToGlobalCommand } from './internal/tools/copy-tool-to-global';
import { createCopyToolToWorkspaceCommand } from './internal/tools/copy-tool-to-workspace';
import { createDeleteToolCommand } from './internal/tools/delete-tool';
import { createGenerateToolsDocsCommand } from './internal/tools/generate-tools-docs';
import { createGoToToolFileCommand } from './internal/tools/go-to-tool-file';
import { createRefreshToolsCommand } from './internal/tools/refresh-tools';
import { createToggleToolsViewCommands } from './internal/tools/toggle-tools-view';
import { createOpenVariablesConfigCommand } from './internal/variables/open-variables-config';
import {
  createOpenVariablesKeybindingsCommand,
  createSetVariableKeybindingCommand,
} from './internal/variables/set-variable-keybinding';
import { createToggleVariablesViewCommands } from './internal/variables/toggle-variables-view';
import { createShowLogsCommand } from './public/show-logs';

export function registerAllCommands(options: {
  context: ExtensionContext;
  taskTreeDataProvider: TaskTreeDataProvider;
  toolTreeDataProvider: ToolTreeDataProvider;
  promptTreeDataProvider: PromptTreeDataProvider;
  variablesProvider: VariablesProvider;
  replacementsProvider: ReplacementsProvider;
  branchContextProvider: BranchContextProvider;
  branchTasksProvider: BranchTasksProvider;
}): Disposable[] {
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
    createRefreshToolsCommand(toolTreeDataProvider),
    createExecuteToolCommand(context),
    createGoToToolFileCommand(),
    createGenerateToolsDocsCommand(),
    createAddToolCommand(),
    createCopyToolToGlobalCommand(),
    createCopyToolToWorkspaceCommand(),
    createDeleteToolCommand(),
    ...createTogglePromptsViewCommands(promptTreeDataProvider),
    createRefreshPromptsCommand(promptTreeDataProvider),
    createExecutePromptCommand(),
    createAddPromptCommand(),
    createCopyPromptToGlobalCommand(),
    createCopyPromptToWorkspaceCommand(),
    createDeletePromptCommand(),
    createGoToPromptFileCommand(),
    ...createEditBranchFieldsCommands(branchContextProvider),
    createOpenBranchContextFileCommand(branchContextProvider),
    createSyncBranchContextCommand(branchContextProvider),
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
      const workspace = getFirstWorkspacePath();
      if (!workspace) return;

      const configPath = getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
      if (!fs.existsSync(configPath)) {
        await VscodeHelper.showToastMessage(ToastKind.Info, 'No config file found');
        return;
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = parseConfig(configContent);
      if (!config) {
        await VscodeHelper.showToastMessage(ToastKind.Error, 'Failed to parse config file');
        return;
      }
      const issues = validateBranchContext(workspace, config.branchContext);

      if (issues.length === 0) {
        await VscodeHelper.showToastMessage(ToastKind.Info, 'No validation issues found');
        return;
      }

      const items = issues.map((issue) => ({
        label: issue.section,
        description: issue.message,
        detail: `Severity: ${issue.severity}`,
        issue,
      }));

      const selected = await VscodeHelper.showQuickPickItems(items, {
        placeHolder: 'Select an issue to view details',
      });

      if (selected) {
        const configUri = VscodeHelper.createFileUri(configPath);
        const templatePath = getBranchContextTemplatePath(workspace);
        const templateUri = VscodeHelper.createFileUri(templatePath);

        await vscode.commands.executeCommand('vscode.open', configUri, vscode.ViewColumn.One);
        await vscode.commands.executeCommand('vscode.open', templateUri, vscode.ViewColumn.Two);
      }
    }),
  ];
}
