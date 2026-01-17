import * as vscode from 'vscode';
import type { CommandParams } from '../../commands/command-params';
import { getCommandId } from '../constants/functions';
import { TypeGuardsHelper } from '../utils/helpers/type-guards-helper';
import type { Disposable } from './vscode-types';

export enum Command {
  Refresh = 'refresh',
  RefreshTools = 'refreshTools',
  RefreshPrompts = 'refreshPrompts',
  SwitchTaskSource = 'switchTaskSource',
  SwitchTaskSourceFromPackage = 'switchTaskSourceFromPackage',
  SwitchTaskSourceFromDevPanel = 'switchTaskSourceFromDevPanel',
  ToggleGroupMode = 'toggleGroupMode',
  ToggleGroupModeGrouped = 'toggleGroupModeGrouped',
  ToggleFavorite = 'toggleFavorite',
  ToggleUnfavorite = 'toggleUnfavorite',
  ToggleHide = 'toggleHide',
  ToggleTasksShowHidden = 'toggleTasksShowHidden',
  ToggleTasksShowHiddenActive = 'toggleTasksShowHiddenActive',
  ToggleTasksShowOnlyFavorites = 'toggleTasksShowOnlyFavorites',
  ToggleTasksShowOnlyFavoritesActive = 'toggleTasksShowOnlyFavoritesActive',
  GoToTask = 'goToTask',
  ExecuteTask = 'executeTask',
  OpenTasksConfig = 'openTasksConfig',
  SelectConfigOption = 'selectConfigOption',
  ResetConfigOption = 'resetConfigOption',
  ToggleConfigsGroupMode = 'toggleConfigsGroupMode',
  ToggleConfigsGroupModeGrouped = 'toggleConfigsGroupModeGrouped',
  ToggleReplacement = 'toggleReplacement',
  ToggleAllReplacementsActivate = 'toggleAllReplacementsActivate',
  ToggleAllReplacementsDeactivate = 'toggleAllReplacementsDeactivate',
  ToggleReplacementsGroupMode = 'toggleReplacementsGroupMode',
  ToggleReplacementsGroupModeGrouped = 'toggleReplacementsGroupModeGrouped',
  ToggleToolsGroupMode = 'toggleToolsGroupMode',
  ToggleToolsGroupModeGrouped = 'toggleToolsGroupModeGrouped',
  ToggleToolFavorite = 'toggleToolFavorite',
  ToggleToolUnfavorite = 'toggleToolUnfavorite',
  ToggleToolHide = 'toggleToolHide',
  ToggleToolsShowHidden = 'toggleToolsShowHidden',
  ToggleToolsShowHiddenActive = 'toggleToolsShowHiddenActive',
  ToggleToolsShowOnlyFavorites = 'toggleToolsShowOnlyFavorites',
  ToggleToolsShowOnlyFavoritesActive = 'toggleToolsShowOnlyFavoritesActive',
  ToggleTool = 'toggleTool',
  ExecuteTool = 'executeTool',
  GoToToolFile = 'goToToolFile',
  GoToReplacementTargetFile = 'goToReplacementTargetFile',
  GenerateToolsDocs = 'generateToolsDocs',
  AddTool = 'addTool',
  CopyToolToGlobal = 'copyToolToGlobal',
  CopyToolToWorkspace = 'copyToolToWorkspace',
  DeleteTool = 'deleteTool',
  TogglePromptsGroupMode = 'togglePromptsGroupMode',
  TogglePromptsGroupModeGrouped = 'togglePromptsGroupModeGrouped',
  TogglePromptFavorite = 'togglePromptFavorite',
  TogglePromptUnfavorite = 'togglePromptUnfavorite',
  TogglePromptHide = 'togglePromptHide',
  TogglePromptsShowHidden = 'togglePromptsShowHidden',
  TogglePromptsShowHiddenActive = 'togglePromptsShowHiddenActive',
  TogglePromptsShowOnlyFavorites = 'togglePromptsShowOnlyFavorites',
  TogglePromptsShowOnlyFavoritesActive = 'togglePromptsShowOnlyFavoritesActive',
  PromptsSelectProvider = 'promptsSelectProvider',
  ExecutePrompt = 'executePrompt',
  GoToPromptFile = 'goToPromptFile',
  AddPrompt = 'addPrompt',
  CopyPromptToGlobal = 'copyPromptToGlobal',
  CopyPromptToWorkspace = 'copyPromptToWorkspace',
  DeletePrompt = 'deletePrompt',
  EditBranchName = 'editBranchName',
  EditBranchPrLink = 'editBranchPrLink',
  EditBranchLinearLink = 'editBranchLinearLink',
  EditBranchObjective = 'editBranchObjective',
  EditBranchRequirements = 'editBranchRequirements',
  EditBranchNotes = 'editBranchNotes',
  EditBranchTodos = 'editBranchTodos',
  OpenBranchContextFile = 'openBranchContextFile',
  OpenBranchContextFileAtLine = 'openBranchContextFileAtLine',
  SyncBranchContext = 'syncBranchContext',
  ShowBranchContextValidation = 'showBranchContextValidation',
  ToggleBranchContextHideEmptySections = 'toggleBranchContextHideEmptySections',
  ToggleBranchContextHideEmptySectionsActive = 'toggleBranchContextHideEmptySectionsActive',
  ToggleTodo = 'toggleTodo',
  CycleTaskStatus = 'cycleTaskStatus',
  SetTaskStatus = 'setTaskStatus',
  SetTaskStatusTodo = 'setTaskStatus.todo',
  SetTaskStatusDoing = 'setTaskStatus.doing',
  SetTaskStatusDone = 'setTaskStatus.done',
  SetTaskStatusBlocked = 'setTaskStatus.blocked',
  SetTaskPriority = 'setTaskPriority',
  SetTaskPriorityUrgent = 'setTaskPriority.urgent',
  SetTaskPriorityHigh = 'setTaskPriority.high',
  SetTaskPriorityMedium = 'setTaskPriority.medium',
  SetTaskPriorityLow = 'setTaskPriority.low',
  SetTaskPriorityNone = 'setTaskPriority.none',
  SetTaskAssignee = 'setTaskAssignee',
  SetTaskDueDate = 'setTaskDueDate',
  AddSubtask = 'addSubtask',
  EditTaskText = 'editTaskText',
  DeleteBranchTask = 'deleteBranchTask',
  CopyTaskText = 'copyTaskText',
  OpenTaskExternal = 'openTaskExternal',
  SetTaskMilestone = 'setTaskMilestone',
  ToggleBranchTasksShowOnlyTodo = 'toggleBranchTasksShowOnlyTodo',
  ToggleBranchTasksShowOnlyTodoActive = 'toggleBranchTasksShowOnlyTodoActive',
  ToggleBranchTasksGroupMode = 'toggleBranchTasksGroupMode',
  ToggleBranchTasksGroupModeGrouped = 'toggleBranchTasksGroupModeGrouped',
  AddBranchTask = 'addBranchTask',
  FilterBranchTasks = 'filterBranchTasks',
  FilterBranchTasksActive = 'filterBranchTasksActive',
  ToggleBranchChangedFilesGroupMode = 'toggleBranchChangedFilesGroupMode',
  ToggleBranchChangedFilesGroupModeGrouped = 'toggleBranchChangedFilesGroupModeGrouped',
  SyncBranchChangedFiles = 'syncBranchChangedFiles',
  SelectComparisonBranch = 'selectComparisonBranch',
  OpenChangedFile = 'openChangedFile',
  OpenChangedFileDiff = 'openChangedFileDiff',
  ShowLogs = 'showLogs',
  ShowWorkspaceState = 'showWorkspaceState',
  ClearWorkspaceState = 'clearWorkspaceState',
  OpenSettingsMenu = 'openSettingsMenu',
  SyncToolKeybindings = 'syncToolKeybindings',
  SetToolKeybinding = 'setToolKeybinding',
  OpenToolsKeybindings = 'openToolsKeybindings',
  SyncPromptKeybindings = 'syncPromptKeybindings',
  SetPromptKeybinding = 'setPromptKeybinding',
  OpenPromptsKeybindings = 'openPromptsKeybindings',
  SyncVariableKeybindings = 'syncVariableKeybindings',
  SetVariableKeybinding = 'setVariableKeybinding',
  OpenVariablesKeybindings = 'openVariablesKeybindings',
  OpenVariablesConfig = 'openVariablesConfig',
  SyncTaskKeybindings = 'syncTaskKeybindings',
  SetTaskKeybinding = 'setTaskKeybinding',
  OpenTasksKeybindings = 'openTasksKeybindings',
  DeleteTask = 'deleteTask',
  CopyTaskToGlobal = 'copyTaskToGlobal',
  CopyTaskToWorkspace = 'copyTaskToWorkspace',
  VscodeOpen = 'vscode.open',
  VscodeSetContext = 'setContext',
  VscodeOpenGlobalKeybindings = 'workbench.action.openGlobalKeybindings',
}

// tscanner-ignore-next-line no-explicit-any
export function registerCommand(command: Command, callback: (...args: any[]) => any): Disposable {
  return vscode.commands.registerCommand(getCommandId(command), callback);
}

// tscanner-ignore-next-line no-explicit-any
export function registerDynamicCommand(commandId: string, callback: (...args: any[]) => any): Disposable {
  return vscode.commands.registerCommand(commandId, callback);
}

const VSCODE_NATIVE_COMMANDS = [
  Command.VscodeOpen,
  Command.VscodeSetContext,
  Command.VscodeOpenGlobalKeybindings,
] as const;

export function executeCommand<T extends Command>(
  command: T,
  ...args: T extends keyof CommandParams ? [CommandParams[T]] : []
): Thenable<unknown> {
  const isNativeCommand = (VSCODE_NATIVE_COMMANDS as readonly Command[]).includes(command);
  const commandId = isNativeCommand ? command : getCommandId(command);

  if (isNativeCommand && args.length > 0) {
    const params = args[0];
    if (command === Command.VscodeOpen && TypeGuardsHelper.isObjectWithProperty(params, 'uri')) {
      const vscodeOpenParams = params as CommandParams[Command.VscodeOpen];
      return vscode.commands.executeCommand(commandId, vscodeOpenParams.uri, vscodeOpenParams.viewColumn);
    }
    if (command === Command.VscodeSetContext && TypeGuardsHelper.isObjectWithProperty(params, 'key')) {
      const setContextParams = params as CommandParams[Command.VscodeSetContext];
      return vscode.commands.executeCommand(commandId, setContextParams.key, setContextParams.value);
    }
    if (command === Command.VscodeOpenGlobalKeybindings && TypeGuardsHelper.isObjectWithProperty(params, 'query')) {
      const openKeybindingsParams = params as CommandParams[Command.VscodeOpenGlobalKeybindings];
      return vscode.commands.executeCommand(commandId, openKeybindingsParams.query);
    }
  }

  return vscode.commands.executeCommand(commandId, ...args);
}
