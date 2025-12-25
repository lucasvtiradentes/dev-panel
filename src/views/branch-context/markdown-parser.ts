import * as fs from 'node:fs';
import { BRANCH_CONTEXT_NA } from '../../common/constants';
import { getBranchContextFilePath as getBranchContextFilePathUtil } from '../../common/lib/config-manager';
import { getFirstWorkspacePath } from '../../common/utils/workspace-utils';

function normalizeValue(value: string | undefined): string | undefined {
  if (!value || value === BRANCH_CONTEXT_NA) return undefined;
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

export function getBranchContextFilePath(branchName: string): string | null {
  const workspace = getFirstWorkspacePath();
  if (!workspace) return null;
  return getBranchContextFilePathUtil(workspace, branchName);
}

export function getFieldLineNumber(filePath: string, fieldName: string): number {
  if (!fs.existsSync(filePath)) return 0;

  const content = fs.readFileSync(filePath, 'utf-8');
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
