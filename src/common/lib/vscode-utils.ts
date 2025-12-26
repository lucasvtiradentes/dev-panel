import * as vscode from 'vscode';
import { getCommandId } from '../constants/functions';
import { CONTEXT_PREFIX } from '../constants/scripts-constants';
import type { Disposable, Uri } from '../vscode/vscode-types';
import type { CommandParams } from './command-params';

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
}

// tscanner-ignore-next-line no-explicit-any
export function registerCommand(command: Command, callback: (...args: any[]) => any): Disposable {
  return vscode.commands.registerCommand(getCommandId(command), callback);
}

export function executeCommand<T extends Command>(
  command: T,
  ...args: T extends keyof CommandParams ? [CommandParams[T]] : []
): Thenable<unknown> {
  return vscode.commands.executeCommand(getCommandId(command), ...args);
}

export function getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined {
  return vscode.workspace.workspaceFolders;
}

export function isMultiRootWorkspace(): boolean {
  const folders = vscode.workspace.workspaceFolders;
  return folders != null && folders.length > 1;
}

export async function openDocumentAtLine(uri: Uri, line: number) {
  await vscode.window.showTextDocument(uri, {
    selection: new vscode.Range(line, 0, line, 0),
  });
}

export const ContextKey = {
  NoConfig: 'noConfig',
  ExtensionInitializing: 'extensionInitializing',
  TaskSourceVSCode: 'taskSourceVSCode',
  TaskSourcePackage: 'taskSourcePackage',
  TaskSourceDevPanel: 'taskSourceDevPanel',
  TasksGrouped: 'tasksGrouped',
  TasksHasGroups: 'tasksHasGroups',
  TasksHasHidden: 'tasksHasHidden',
  TasksShowHidden: 'tasksShowHidden',
  TasksHasFavorites: 'tasksHasFavorites',
  TasksShowOnlyFavorites: 'tasksShowOnlyFavorites',
  ToolsGrouped: 'toolsGrouped',
  ToolsHasHidden: 'toolsHasHidden',
  ToolsShowHidden: 'toolsShowHidden',
  ToolsHasFavorites: 'toolsHasFavorites',
  ToolsShowOnlyFavorites: 'toolsShowOnlyFavorites',
  PromptsGrouped: 'promptsGrouped',
  PromptsHasHidden: 'promptsHasHidden',
  PromptsShowHidden: 'promptsShowHidden',
  PromptsHasFavorites: 'promptsHasFavorites',
  PromptsShowOnlyFavorites: 'promptsShowOnlyFavorites',
  ReplacementsGrouped: 'replacementsGrouped',
  ReplacementsAllActive: 'replacementsAllActive',
  ConfigsGrouped: 'configsGrouped',
  BranchContextHideEmptySections: 'branchContextHideEmptySections',
  BranchTasksShowOnlyTodo: 'branchTasksShowOnlyTodo',
  BranchTasksGrouped: 'branchTasksGrouped',
  BranchTasksHasFilter: 'branchTasksHasFilter',
  BranchTasksHasExternalProvider: 'branchTasksHasExternalProvider',
  WorkspaceId: `${CONTEXT_PREFIX}.workspaceId`,
} as const;

export type ContextKey = (typeof ContextKey)[keyof typeof ContextKey];

export function setContextKey(key: ContextKey, value: boolean | string): Thenable<unknown> {
  return vscode.commands.executeCommand('setContext', key, value);
}

export function generateWorkspaceId(): string {
  const folders = vscode.workspace.workspaceFolders ?? [];
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
