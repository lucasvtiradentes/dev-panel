import * as vscode from 'vscode';
import type { CommandParams } from '../../commands/command-params';
import { IS_DEV } from '../constants/constants';
import { getCommandId } from '../constants/functions';
import { CONTEXT_PREFIX, DEV_SUFFIX } from '../constants/scripts-constants';
import { VscodeHelper } from './vscode-helper';
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
  SyncBranchTasks = 'syncBranchTasks',
  FilterBranchTasks = 'filterBranchTasks',
  FilterBranchTasksActive = 'filterBranchTasksActive',
  ShowLogs = 'showLogs',
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
    if (command === Command.VscodeOpen && params && typeof params === 'object' && 'uri' in params) {
      const vscodeOpenParams = params as CommandParams[Command.VscodeOpen];
      return vscode.commands.executeCommand(commandId, vscodeOpenParams.uri, vscodeOpenParams.viewColumn);
    }
    if (command === Command.VscodeSetContext && params && typeof params === 'object' && 'key' in params) {
      const setContextParams = params as CommandParams[Command.VscodeSetContext];
      return vscode.commands.executeCommand(commandId, setContextParams.key, setContextParams.value);
    }
    if (command === Command.VscodeOpenGlobalKeybindings && params && typeof params === 'object' && 'query' in params) {
      const openKeybindingsParams = params as CommandParams[Command.VscodeOpenGlobalKeybindings];
      return vscode.commands.executeCommand(commandId, openKeybindingsParams.query);
    }
  }

  return vscode.commands.executeCommand(commandId, ...args);
}

export function isMultiRootWorkspace(): boolean {
  const folders = VscodeHelper.getWorkspaceFolders();
  return folders.length > 1;
}

export function generateWorkspaceId(): string {
  const folders = VscodeHelper.getWorkspaceFolders();
  if (folders.length === 0) return '';
  const paths = folders
    .map((f) => f.uri.fsPath)
    .sort()
    .join('|');
  let hash = 0;
  for (let i = 0; i < paths.length; i++) {
    const char = paths.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

let currentWorkspaceId = '';
export function getWorkspaceId(): string {
  return currentWorkspaceId;
}
export function setWorkspaceId(id: string) {
  currentWorkspaceId = id;
}

export enum ExtensionConfigKey {
  AutoRefresh = 'autorefresh',
}

type ExtensionConfigSchema = {
  [ExtensionConfigKey.AutoRefresh]: boolean;
};

const extensionConfigDefaults: ExtensionConfigSchema = {
  [ExtensionConfigKey.AutoRefresh]: true,
};

function getExtensionConfigSection(): string {
  return IS_DEV ? `${CONTEXT_PREFIX}${DEV_SUFFIX}` : CONTEXT_PREFIX;
}

export function getExtensionConfig<K extends ExtensionConfigKey>(key: K): ExtensionConfigSchema[K] {
  const config = VscodeHelper.getConfiguration(getExtensionConfigSection());
  return config.get<ExtensionConfigSchema[K]>(key) ?? extensionConfigDefaults[key];
}
