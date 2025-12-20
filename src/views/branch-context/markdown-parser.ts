import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { BranchContext } from '../../common/types';

const BRANCH_CONTEXT_FILE = '.branch-context.md';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

const NA = 'N/A';

function normalizeValue(value: string | undefined): string | undefined {
  if (!value || value === NA) return undefined;
  return value;
}

function extractField(content: string, fieldName: string): string | undefined {
  const regex = new RegExp(`^${fieldName}:\\s*(.*)$`, 'im');
  const match = content.match(regex);
  const value = match?.[1]?.trim();
  return normalizeValue(value);
}

function extractSection(content: string, sectionName: string): string | undefined {
  const sectionRegex = new RegExp(`^#\\s+${sectionName}\\s*$`, 'im');
  const match = content.match(sectionRegex);
  if (!match || match.index === undefined) return undefined;

  const startIndex = match.index + match[0].length;
  const nextSectionMatch = content.slice(startIndex).match(/^#\s+/m);
  const endIndex = nextSectionMatch?.index !== undefined ? startIndex + nextSectionMatch.index : content.length;

  const sectionContent = content.slice(startIndex, endIndex).trim();
  return normalizeValue(sectionContent);
}

export function parseBranchContextMarkdown(): { branchName: string; context: BranchContext } | null {
  const workspace = getWorkspacePath();
  if (!workspace) return null;

  const mdPath = path.join(workspace, BRANCH_CONTEXT_FILE);
  if (!fs.existsSync(mdPath)) return null;

  const content = fs.readFileSync(mdPath, 'utf-8');

  const branchMatch = content.match(/^#\s+(.+)$/m);
  if (!branchMatch) return null;

  const branchName = branchMatch[1].trim();

  const context: BranchContext = {
    prLink: extractField(content, 'PR LINK'),
    linearLink: extractField(content, 'LINEAR LINK'),
    objective: extractSection(content, 'OBJECTIVE'),
    notes: extractSection(content, 'NOTES'),
    todos: extractSection(content, 'TODO'),
  };

  return { branchName, context };
}

export function getBranchContextFilePath(): string | null {
  const workspace = getWorkspacePath();
  if (!workspace) return null;
  return path.join(workspace, BRANCH_CONTEXT_FILE);
}

export function getFieldLineNumber(fieldName: string): number {
  const workspace = getWorkspacePath();
  if (!workspace) return 0;

  const mdPath = path.join(workspace, BRANCH_CONTEXT_FILE);
  if (!fs.existsSync(mdPath)) return 0;

  const content = fs.readFileSync(mdPath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp(`^#\\s+${fieldName}\\s*$`, 'i'))) {
      return i + 2;
    }
    if (lines[i].match(new RegExp(`^${fieldName}:`, 'i'))) {
      return i;
    }
  }

  return 0;
}
