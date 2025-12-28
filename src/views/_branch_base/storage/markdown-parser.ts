import { ConfigManager } from '../../../common/core/config-manager';
import { MarkdownHelper } from '../../../common/utils/helpers/markdown-helper';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';

export function getBranchContextFilePath(branchName: string): string | null {
  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) return null;
  return ConfigManager.getBranchContextFilePath(workspace, branchName);
}

export function getFieldLineNumber(filePath: string, fieldName: string): number {
  return MarkdownHelper.getFieldLineNumber(filePath, fieldName);
}
