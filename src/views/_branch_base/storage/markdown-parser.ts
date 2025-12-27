import { FileIOHelper } from '../../../common/lib/node-helper';
import { ConfigManager } from '../../../common/utils/config-manager';
import { getFirstWorkspacePath } from '../../../common/vscode/workspace-utils';

export function getBranchContextFilePath(branchName: string): string | null {
  const workspace = getFirstWorkspacePath();
  if (!workspace) return null;
  return ConfigManager.getBranchContextFilePath(workspace, branchName);
}

export function getFieldLineNumber(filePath: string, fieldName: string): number {
  if (!FileIOHelper.fileExists(filePath)) return 0;

  const content = FileIOHelper.readFile(filePath);
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
