import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { BranchContext } from '../../common/types';
import { isGitRepository } from '../replacements/git-utils';

const BRANCH_CONTEXT_FILE = '.branch-context.md';

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

export async function generateBranchContextMarkdown(branchName: string, context: BranchContext): Promise<void> {
  const workspace = getWorkspacePath();
  if (!workspace) return;

  const mdPath = path.join(workspace, BRANCH_CONTEXT_FILE);

  const lines: string[] = [`# Branch Context: ${branchName}`, ''];

  if (context.objective) {
    lines.push('## Objective', '', context.objective, '');
  }

  if (context.linearIssue) {
    lines.push('## Linear Issue', '', context.linearIssue, '');
  }

  if (context.notes) {
    lines.push('## Notes', '', context.notes, '');
  }

  if (!context.objective && !context.linearIssue && !context.notes) {
    lines.push('*No context set for this branch.*', '');
  }

  fs.writeFileSync(mdPath, lines.join('\n'));

  if (await isGitRepository(workspace)) {
    addToGitExclude(workspace, BRANCH_CONTEXT_FILE);
  }
}
