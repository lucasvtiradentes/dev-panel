import * as vscode from 'vscode';
import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';
import type { WorkspaceFolder } from '../vscode/vscode-types';

export function getFirstWorkspaceFolder(): WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

export function getFirstWorkspacePath(): string | null {
  return getFirstWorkspaceFolder()?.uri.fsPath ?? null;
}

export function requireWorkspaceFolder(): WorkspaceFolder | null {
  const folder = getFirstWorkspaceFolder();
  if (!folder) {
    VscodeHelper.showToastMessage(ToastKind.Error, 'No workspace folder found');
    return null;
  }
  return folder;
}

export async function selectWorkspaceFolder(placeholder: string): Promise<WorkspaceFolder | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    VscodeHelper.showToastMessage(ToastKind.Error, 'No workspace folder found');
    return null;
  }

  if (folders.length === 1) {
    return folders[0];
  }

  const items = folders.map((f) => ({ label: f.name, folder: f }));
  const selected = await vscode.window.showQuickPick(items, { placeHolder: placeholder });
  return selected?.folder ?? null;
}
