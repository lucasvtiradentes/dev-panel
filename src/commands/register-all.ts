import { syncKeybindings } from '../common/core/keybindings-sync';
import { Command, registerCommand } from '../common/vscode/vscode-commands';
import type { Disposable, ExtensionContext } from '../common/vscode/vscode-types';
import { createOpenSettingsMenuCommand } from '../status-bar/status-bar-actions';
import type { ReplacementsProvider } from '../views/replacements';
import type { TaskTreeDataProvider } from '../views/tasks';
import type { VariablesProvider } from '../views/variables';
import { createAddExcludeCommand } from './internal/excludes/add-exclude';
import { createOpenExcludeFileCommand } from './internal/excludes/open-exclude-file';
import { createRemoveExcludeCommand } from './internal/excludes/remove-exclude';
import { createExecuteTaskCommand } from './internal/execute-task';
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
import { createOpenVariablesConfigCommand } from './internal/variables/open-variables-config';
import {
  createOpenVariablesKeybindingsCommand,
  createSetVariableKeybindingCommand,
} from './internal/variables/set-variable-keybinding';
import { createToggleVariablesViewCommands } from './internal/variables/toggle-variables-view';
import { createClearWorkspaceStateCommand } from './public/clear-workspace-state';
import { createShowLogsCommand } from './public/show-logs';
import { createShowWorkspaceStateCommand } from './public/show-workspace-state';

export function registerAllCommands(options: {
  context: ExtensionContext;
  taskTreeDataProvider: TaskTreeDataProvider;
  variablesProvider: VariablesProvider;
  replacementsProvider: ReplacementsProvider;
}): Disposable[] {
  const { context, taskTreeDataProvider, variablesProvider, replacementsProvider } = options;
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
    createAddExcludeCommand(),
    createRemoveExcludeCommand(),
    createOpenExcludeFileCommand(),
    createShowLogsCommand(),
    createShowWorkspaceStateCommand(),
    createClearWorkspaceStateCommand(),
    registerCommand(Command.SyncVariableKeybindings, () => syncKeybindings()),
    createSetVariableKeybindingCommand(),
    createOpenVariablesKeybindingsCommand(),
    createOpenVariablesConfigCommand(),
    registerCommand(Command.SyncTaskKeybindings, () => syncKeybindings()),
    createSetTaskKeybindingCommand(),
    createOpenTasksKeybindingsCommand(),
  ];
}
