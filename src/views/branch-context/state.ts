import * as vscode from 'vscode';
import type { BranchContext } from '../../common/schemas/types';
import { loadBranchContextFromFile } from './file-storage';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export const loadBranchContext = (branchName: string): BranchContext => {
  const workspace = getWorkspacePath();
  if (!workspace) return {};
  return loadBranchContextFromFile(workspace, branchName);
};
