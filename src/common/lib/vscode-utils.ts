import * as vscode from 'vscode';
import { getCommandId, getContextKey as getContextKeyWithDev } from '../constants';

export enum Command {
  Refresh = 'refresh',
  Unhide = 'unhide',
  ShowList = 'showList',
  GoToTask = 'goToTask',
  ExecuteTask = 'executeTask',
  ExecCmdline = 'execCmdline',
  ExitCmdline = 'exitCmdline',
  BackCmdline = 'backCmdline',
  TabCmdline = 'tabCmdline',
  SelectConfigOption = 'selectConfigOption',
  ToggleReplacement = 'toggleReplacement',
  RevertAllReplacements = 'revertAllReplacements',
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
}

export function setContextKey(key: ContextKey, value: boolean): Thenable<unknown> {
  return vscode.commands.executeCommand('setContext', getContextKeyWithDev(key), value);
}
