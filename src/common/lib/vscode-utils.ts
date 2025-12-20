import * as vscode from 'vscode';
import { getCommandId } from '../constants/constants';

export enum Command {
  Refresh = 'refresh',
  SwitchTaskSource = 'switchTaskSource',
  SwitchTaskSourceFromPackage = 'switchTaskSourceFromPackage',
  SwitchTaskSourceFromPP = 'switchTaskSourceFromPP',
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
  ExecCmdline = 'execCmdline',
  ExitCmdline = 'exitCmdline',
  BackCmdline = 'backCmdline',
  TabCmdline = 'tabCmdline',
  SelectConfigOption = 'selectConfigOption',
  ResetConfigOption = 'resetConfigOption',
  RefreshConfigs = 'refreshConfigs',
  ToggleConfigsGroupMode = 'toggleConfigsGroupMode',
  ToggleConfigsGroupModeGrouped = 'toggleConfigsGroupModeGrouped',
  ToggleReplacement = 'toggleReplacement',
  RevertAllReplacements = 'revertAllReplacements',
  RefreshReplacements = 'refreshReplacements',
  ToggleReplacementsGroupMode = 'toggleReplacementsGroupMode',
  ToggleReplacementsGroupModeGrouped = 'toggleReplacementsGroupModeGrouped',
  RefreshTools = 'refreshTools',
  ToggleToolsGroupMode = 'toggleToolsGroupMode',
  ToggleToolsGroupModeGrouped = 'toggleToolsGroupModeGrouped',
  ToggleToolFavorite = 'toggleToolFavorite',
  ToggleToolUnfavorite = 'toggleToolUnfavorite',
  ToggleToolHide = 'toggleToolHide',
  ToggleToolsShowHidden = 'toggleToolsShowHidden',
  ToggleToolsShowHiddenActive = 'toggleToolsShowHiddenActive',
  ToggleToolsShowOnlyFavorites = 'toggleToolsShowOnlyFavorites',
  ToggleToolsShowOnlyFavoritesActive = 'toggleToolsShowOnlyFavoritesActive',
  ExecuteTool = 'executeTool',
  GoToToolFile = 'goToToolFile',
  RefreshPrompts = 'refreshPrompts',
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
  RefreshBranchContext = 'refreshBranchContext',
  EditBranchPrLink = 'editBranchPrLink',
  EditBranchLinearLink = 'editBranchLinearLink',
  EditBranchObjective = 'editBranchObjective',
  EditBranchNotes = 'editBranchNotes',
  EditBranchTodos = 'editBranchTodos',
  OpenBranchContextFile = 'openBranchContextFile',
  ToggleTodo = 'toggleTodo',
  ShowLogs = 'showLogs',
  SyncToolKeybindings = 'syncToolKeybindings',
  SetToolKeybinding = 'setToolKeybinding',
  OpenToolsKeybindings = 'openToolsKeybindings',
  SyncPromptKeybindings = 'syncPromptKeybindings',
  SetPromptKeybinding = 'setPromptKeybinding',
  OpenPromptsKeybindings = 'openPromptsKeybindings',
  SyncReplacementKeybindings = 'syncReplacementKeybindings',
  SetReplacementKeybinding = 'setReplacementKeybinding',
  OpenReplacementsKeybindings = 'openReplacementsKeybindings',
  SyncVariableKeybindings = 'syncVariableKeybindings',
  SetVariableKeybinding = 'setVariableKeybinding',
  OpenVariablesKeybindings = 'openVariablesKeybindings',
  SyncTaskKeybindings = 'syncTaskKeybindings',
  SetTaskKeybinding = 'setTaskKeybinding',
  OpenTasksKeybindings = 'openTasksKeybindings',
}

export function registerCommand(command: Command, callback: (...args: any[]) => any): vscode.Disposable {
  return vscode.commands.registerCommand(getCommandId(command), callback);
}

export enum ToastKind {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export function showToastMessage(kind: ToastKind, message: string, ...items: string[]): Thenable<string | undefined> {
  switch (kind) {
    case ToastKind.Info:
      return vscode.window.showInformationMessage(message, ...items);
    case ToastKind.Warning:
      return vscode.window.showWarningMessage(message, ...items);
    case ToastKind.Error:
      return vscode.window.showErrorMessage(message, ...items);
  }
}

export function getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined {
  return vscode.workspace.workspaceFolders;
}

export function isMultiRootWorkspace(): boolean {
  const folders = vscode.workspace.workspaceFolders;
  return folders != null && folders.length > 1;
}

export async function openDocumentAtLine(uri: vscode.Uri, line: number): Promise<void> {
  await vscode.window.showTextDocument(uri, {
    selection: new vscode.Range(line, 0, line, 0),
  });
}

export enum ContextKey {
  InCmdlineMode = 'inCmdlineMode',
  TaskSourceVSCode = 'taskSourceVSCode',
  TaskSourcePackage = 'taskSourcePackage',
  TaskSourcePP = 'taskSourcePP',
  TasksGrouped = 'tasksGrouped',
  TasksHasGroups = 'tasksHasGroups',
  TasksHasHidden = 'tasksHasHidden',
  TasksShowHidden = 'tasksShowHidden',
  TasksHasFavorites = 'tasksHasFavorites',
  TasksShowOnlyFavorites = 'tasksShowOnlyFavorites',
  ToolsGrouped = 'toolsGrouped',
  ToolsHasHidden = 'toolsHasHidden',
  ToolsShowHidden = 'toolsShowHidden',
  ToolsHasFavorites = 'toolsHasFavorites',
  ToolsShowOnlyFavorites = 'toolsShowOnlyFavorites',
  PromptsGrouped = 'promptsGrouped',
  PromptsHasHidden = 'promptsHasHidden',
  PromptsShowHidden = 'promptsShowHidden',
  PromptsHasFavorites = 'promptsHasFavorites',
  PromptsShowOnlyFavorites = 'promptsShowOnlyFavorites',
  ReplacementsGrouped = 'replacementsGrouped',
  ConfigsGrouped = 'configsGrouped',
}

export function setContextKey(key: ContextKey, value: boolean): Thenable<unknown> {
  return vscode.commands.executeCommand('setContext', key, value);
}
