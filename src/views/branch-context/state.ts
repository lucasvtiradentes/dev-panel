import * as vscode from 'vscode';
import { BRANCH_CONTEXT_CACHE_TTL_MS } from '../../common/constants';
import type { BranchContext } from '../../common/schemas/types';
import { FileHashCache } from '../../common/utils/cache';
import { loadBranchContextFromFile } from './file-storage';
import { getBranchContextFilePath } from './markdown-parser';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

const contextCache = new FileHashCache<BranchContext>(BRANCH_CONTEXT_CACHE_TTL_MS);

export const loadBranchContext = (branchName: string): BranchContext => {
  const workspace = getWorkspacePath();
  if (!workspace) return {};

  const filePath = getBranchContextFilePath(branchName);
  if (!filePath) return {};

  const cached = contextCache.getWithFileHash(branchName, filePath);
  if (cached) {
    return cached;
  }

  const context = loadBranchContextFromFile(workspace, branchName);
  contextCache.setWithFileHash(branchName, context, filePath);
  return context;
};
