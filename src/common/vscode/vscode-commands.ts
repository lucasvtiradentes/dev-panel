import * as vscode from 'vscode';
import { getCommandId } from '../constants/functions';
import type { Disposable } from './vscode-types';

export enum Command {
  Refresh = 'refresh',
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
  GoToReplacementTargetFile = 'goToReplacementTargetFile',
  AddExclude = 'addExclude',
  RemoveExclude = 'removeExclude',
  OpenExcludeFile = 'openExcludeFile',
  ShowLogs = 'showLogs',
  ShowWorkspaceState = 'showWorkspaceState',
  ClearWorkspaceState = 'clearWorkspaceState',
  OpenSettingsMenu = 'openSettingsMenu',
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
