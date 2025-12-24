import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { BRANCH_CONTEXT_DEFAULT_TODOS, BRANCH_CONTEXT_NA, ChangedFilesStyle } from '../../common/constants';
import { getBranchContextFilePath, getBranchDirectory } from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import type { BranchContext } from '../../common/schemas/types';
import { getChangedFilesTree } from './git-changed-files';
import { loadTemplate } from './template-parser';

const logger = createLogger('MarkdownGenerator');

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export async function generateBranchContextMarkdown(branchName: string, context: BranchContext): Promise<void> {
  logger.info(`[generateBranchContextMarkdown] Called for branch: ${branchName}`);

  const workspace = getWorkspacePath();
  if (!workspace) {
    logger.warn('[generateBranchContextMarkdown] No workspace found');
    return;
  }

  logger.info(`[generateBranchContextMarkdown] Workspace: ${workspace}`);

  const dirPath = getBranchDirectory(workspace, branchName);
  if (!fs.existsSync(dirPath)) {
    logger.info(`[generateBranchContextMarkdown] Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const mdPath = getBranchContextFilePath(workspace, branchName);
  logger.info(`[generateBranchContextMarkdown] Markdown path: ${mdPath}`);

  const template = loadTemplate(workspace);

  const useExistingChanges = !!context.changedFiles;
  logger.info(`[generateBranchContextMarkdown] Using existing changed files: ${useExistingChanges}`);

  const changedFilesTree = context.changedFiles || (await getChangedFilesTree(workspace, ChangedFilesStyle.List));
  logger.info(
    `[generateBranchContextMarkdown] Changed files result (first 100 chars): ${changedFilesTree.substring(0, 100)}`,
  );

  const replacements: Record<string, string> = {
    BRANCH_NAME: branchName,
    PR_LINK: context.prLink || BRANCH_CONTEXT_NA,
    LINEAR_LINK: context.linearLink || BRANCH_CONTEXT_NA,
    OBJECTIVE: context.objective || BRANCH_CONTEXT_NA,
    REQUIREMENTS: context.requirements || BRANCH_CONTEXT_NA,
    NOTES: context.notes || BRANCH_CONTEXT_NA,
    TASKS: context.todos || BRANCH_CONTEXT_DEFAULT_TODOS,
    CHANGED_FILES: changedFilesTree,
  };

  let output = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
    output = output.replace(regex, value);
  }

  fs.writeFileSync(mdPath, output);
}
