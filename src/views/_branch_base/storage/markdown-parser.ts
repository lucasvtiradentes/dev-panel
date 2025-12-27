import * as fs from 'node:fs';
import { ConfigManager } from '../../../common/lib/config-manager';
import { getFirstWorkspacePath } from '../../../common/utils/workspace-utils';

export function getBranchContextFilePath(branchName: string): string | null {
  const workspace = getFirstWorkspacePath();
  if (!workspace) return null;
  return ConfigManager.getBranchContextFilePath(workspace, branchName);
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
