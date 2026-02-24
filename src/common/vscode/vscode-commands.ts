import * as vscode from 'vscode';
import { getCommandId } from '../constants/functions';
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

export function executeCommand(command: Command, ...args: unknown[]): Thenable<unknown> {
  const VSCODE_NATIVE_COMMANDS = [
    Command.VscodeOpen,
    Command.VscodeSetContext,
    Command.VscodeOpenGlobalKeybindings,
  ] as const;

  const isNativeCommand = (VSCODE_NATIVE_COMMANDS as readonly Command[]).includes(command);
  const commandId = isNativeCommand ? command : getCommandId(command);

  return vscode.commands.executeCommand(commandId, ...args);
}
