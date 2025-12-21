import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { getBranchContextFilePath, getBranchDirectory } from '../../common/constants/scripts-constants';
import type { BranchContext } from '../../common/schemas/types';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

const DEFAULT_TODOS = `- [ ] task1
- [ ] task2`;

const NA = 'N/A';

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
}
