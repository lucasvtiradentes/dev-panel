import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { BRANCH_CONTEXT_FILE_NAME } from '../../common/constants';
import type { BranchContext } from '../../common/schemas/types';
import { isGitRepository } from '../replacements/git-utils';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function addToGitExclude(workspace: string, pattern: string): void {
  const excludePath = path.join(workspace, '.git', 'info', 'exclude');
  if (!fs.existsSync(excludePath)) return;

  const content = fs.readFileSync(excludePath, 'utf-8');
  if (content.includes(pattern)) return;

  const newContent = content.endsWith('\n') ? `${content}${pattern}\n` : `${content}\n${pattern}\n`;
  fs.writeFileSync(excludePath, newContent);
}

const DEFAULT_TODOS = `- [ ] task1
- [ ] task2`;

const NA = 'N/A';

export async function generateBranchContextMarkdown(branchName: string, context: BranchContext): Promise<void> {
  const workspace = getWorkspacePath();
  if (!workspace) return;

  const mdPath = path.join(workspace, BRANCH_CONTEXT_FILE_NAME);

  const lines: string[] = [
    `# ${branchName}`,
    '',
    `PR LINK: ${context.prLink || NA}`,
    `LINEAR LINK: ${context.linearLink || NA}`,
    '',
    '# OBJECTIVE',
    '',
    context.objective || NA,
    '',
    '# NOTES',
    '',
    context.notes || NA,
    '',
    '# TODO',
    '',
    context.todos || DEFAULT_TODOS,
    '',
  ];

  fs.writeFileSync(mdPath, lines.join('\n'));

  if (await isGitRepository(workspace)) {
    addToGitExclude(workspace, BRANCH_CONTEXT_FILE_NAME);
  }
}
