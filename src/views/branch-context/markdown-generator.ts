import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  BRANCH_CONTEXT_DEFAULT_TODOS,
  BRANCH_CONTEXT_FIELD_LINEAR_LINK,
  BRANCH_CONTEXT_FIELD_PR_LINK,
  BRANCH_CONTEXT_NA,
  BRANCH_CONTEXT_SECTION_NOTES,
  BRANCH_CONTEXT_SECTION_OBJECTIVE,
  BRANCH_CONTEXT_SECTION_REQUIREMENTS,
  BRANCH_CONTEXT_SECTION_TODO,
} from '../../common/constants';
import { getBranchContextFilePath, getBranchDirectory } from '../../common/lib/config-manager';
import type { BranchContext } from '../../common/schemas/types';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export function generateBranchContextMarkdown(branchName: string, context: BranchContext): void {
  const workspace = getWorkspacePath();
  if (!workspace) return;

  const dirPath = getBranchDirectory(workspace, branchName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const mdPath = getBranchContextFilePath(workspace, branchName);

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
  ];

  fs.writeFileSync(mdPath, lines.join('\n'));
}
