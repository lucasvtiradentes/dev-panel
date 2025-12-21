import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { BRANCH_CONTEXT_DEFAULT_TODOS, BRANCH_CONTEXT_NA } from '../../common/constants';
import { getBranchContextFilePath, getBranchDirectory } from '../../common/constants/scripts-constants';
import type { BranchContext } from '../../common/schemas/types';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export async function generateBranchContextMarkdown(branchName: string, context: BranchContext): Promise<void> {
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
    `PR LINK: ${context.prLink || BRANCH_CONTEXT_NA}`,
    `LINEAR LINK: ${context.linearLink || BRANCH_CONTEXT_NA}`,
    '',
    '# OBJECTIVE',
    '',
    context.objective || BRANCH_CONTEXT_NA,
    '',
    '# NOTES',
    '',
    context.notes || BRANCH_CONTEXT_NA,
    '',
    '# TODO',
    '',
    context.todos || BRANCH_CONTEXT_DEFAULT_TODOS,
    '',
  ];

  fs.writeFileSync(mdPath, lines.join('\n'));
}
