import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  BRANCH_CONTEXT_DEFAULT_TODOS,
  BRANCH_CONTEXT_FIELD_LINEAR_LINK,
  BRANCH_CONTEXT_FIELD_PR_LINK,
  BRANCH_CONTEXT_NA,
  BRANCH_CONTEXT_SECTION_CHANGED_FILES,
  BRANCH_CONTEXT_SECTION_NOTES,
  BRANCH_CONTEXT_SECTION_OBJECTIVE,
  BRANCH_CONTEXT_SECTION_REQUIREMENTS,
  BRANCH_CONTEXT_SECTION_TODO,
  ChangedFilesStyle,
} from '../../common/constants';
import { getBranchContextFilePath, getBranchDirectory } from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import type { BranchContext } from '../../common/schemas/types';
import { getChangedFilesTree } from './git-changed-files';

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

  const useExistingChanges = !!context.changedFiles;
  logger.info(`[generateBranchContextMarkdown] Using existing changed files: ${useExistingChanges}`);

  const changedFilesTree = context.changedFiles || (await getChangedFilesTree(workspace, ChangedFilesStyle.List));
  logger.info(
    `[generateBranchContextMarkdown] Changed files result (first 100 chars): ${changedFilesTree.substring(0, 100)}`,
  );

  const lines: string[] = [
    `# ${branchName}`,
    '',
    `${BRANCH_CONTEXT_FIELD_PR_LINK} ${context.prLink || BRANCH_CONTEXT_NA}`,
    `${BRANCH_CONTEXT_FIELD_LINEAR_LINK} ${context.linearLink || BRANCH_CONTEXT_NA}`,
    '',
    BRANCH_CONTEXT_SECTION_OBJECTIVE,
    '',
    context.objective || BRANCH_CONTEXT_NA,
    '',
    BRANCH_CONTEXT_SECTION_REQUIREMENTS,
    '',
    context.requirements || BRANCH_CONTEXT_NA,
    '',
    BRANCH_CONTEXT_SECTION_NOTES,
    '',
    context.notes || BRANCH_CONTEXT_NA,
    '',
    BRANCH_CONTEXT_SECTION_TODO,
    '',
    context.todos || BRANCH_CONTEXT_DEFAULT_TODOS,
    '',
    BRANCH_CONTEXT_SECTION_CHANGED_FILES,
    '',
    '```',
    changedFilesTree,
    '```',
    '',
  ];

  fs.writeFileSync(mdPath, lines.join('\n'));
}
