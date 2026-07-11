import { syncKeybindings } from '../common/core/keybindings-sync';
import { Command, registerCommand } from '../common/vscode/vscode-commands';
import type { Disposable, ExtensionContext } from '../common/vscode/vscode-types';
import type { GitExcludesProvider } from '../views/git-excludes';
import type { ReplacementsProvider } from '../views/replacements';
import type { TaskTreeDataProvider } from '../views/tasks';
import type { VariablesProvider } from '../views/variables';
import type { VscodeExcludesProvider } from '../views/vscode-excludes';
import { createExecuteTaskCommand } from './internal/execute-task';
import { createAddExcludeCommand } from './internal/git-excludes/add-exclude';
import { createOpenExcludeFileCommand } from './internal/git-excludes/open-exclude-file';
import { createRemoveExcludeCommand } from './internal/git-excludes/remove-exclude';
import { createToggleExcludeCommand } from './internal/git-excludes/toggle-exclude';
import { createToggleExcludesViewCommands } from './internal/git-excludes/toggle-excludes-view';
import { createGoToReplacementTargetFileCommand } from './internal/replacements/go-to-replacement-target-file';
import { createPreviewReplacementDiffCommand } from './internal/replacements/preview-replacement-diff';
import {
  createToggleAllReplacementsActivateCommand,
  createToggleAllReplacementsDeactivateCommand,
} from './internal/replacements/toggle-all-replacements';
import { createToggleReplacementCommand } from './internal/replacements/toggle-replacement';
import { createToggleReplacementsViewCommands } from './internal/replacements/toggle-replacements-view';
import { createResetConfigOptionCommand, createSelectConfigOptionCommand } from './internal/select-config-option';
import { createDeleteTaskCommand } from './internal/tasks/delete-task';
import { createGoToTaskCommand } from './internal/tasks/go-to-task';
import { createManageTaskScanIgnoresCommand } from './internal/tasks/manage-task-scan-ignores';
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
import { createVscodeExcludesCommands } from './internal/vscode-excludes/vscode-excludes-commands';
import { createChangeTasksLocationCommand } from './public/change-tasks-location';
import { createClearWorkspaceStateCommand } from './public/clear-workspace-state';
import { createSelectWorkspaceCommand } from './public/select-workspace';
import { createShowLogsCommand } from './public/show-logs';
import { createShowWorkspaceStateCommand } from './public/show-workspace-state';

export function registerAllCommands(options: {
  context: ExtensionContext;
  taskTreeDataProvider: TaskTreeDataProvider;
  variablesProvider: VariablesProvider;
  replacementsProvider: ReplacementsProvider;
  gitExcludesProvider: GitExcludesProvider;
  vscodeExcludesProvider: VscodeExcludesProvider;
}): Disposable[] {
  const {
    context,
    taskTreeDataProvider,
    variablesProvider,
    replacementsProvider,
    gitExcludesProvider,
    vscodeExcludesProvider,
  } = options;
  return [
    createRefreshCommand(taskTreeDataProvider),
    ...createSwitchTaskSourceCommands(taskTreeDataProvider),
    ...createToggleTasksViewCommands(taskTreeDataProvider),
    createGoToTaskCommand(),
    createOpenTasksConfigCommand(),
    createManageTaskScanIgnoresCommand(taskTreeDataProvider),
    createDeleteTaskCommand(),
    createExecuteTaskCommand(context),
    createSelectWorkspaceCommand(),
    createChangeTasksLocationCommand(),
    createSelectConfigOptionCommand(),
    createResetConfigOptionCommand(),
    ...createToggleVariablesViewCommands(variablesProvider),
    createToggleReplacementCommand(),
    createToggleAllReplacementsActivateCommand(),
    createToggleAllReplacementsDeactivateCommand(),
    ...createToggleReplacementsViewCommands(replacementsProvider),
    createGoToReplacementTargetFileCommand(),
    ...createPreviewReplacementDiffCommand(),
    createAddExcludeCommand(),
    createRemoveExcludeCommand(),
    createOpenExcludeFileCommand(),
    createToggleExcludeCommand(),
    ...createToggleExcludesViewCommands(gitExcludesProvider),
    ...createVscodeExcludesCommands(vscodeExcludesProvider),
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
