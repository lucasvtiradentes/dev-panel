import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { BranchContext } from '../../common/types';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export function generateBranchContextMarkdown(branchName: string, context: BranchContext): void {
  const workspace = getWorkspacePath();
  if (!workspace) return;

  const mdPath = path.join(workspace, '.branch-context.md');

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
}
