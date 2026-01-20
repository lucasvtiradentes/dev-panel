import { BASE_BRANCH } from '../../common/constants';
import { FileIOHelper } from '../../common/utils/helpers/node-helper';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { SyncContext } from './providers/interfaces';
import { getBranchContextFilePath, loadBranchContext } from './storage';

export class SyncContextHelper {
  static create(branchName: string, comparisonBranch = BASE_BRANCH): SyncContext | null {
    const filePath = getBranchContextFilePath(branchName);
    if (!filePath || !FileIOHelper.fileExists(filePath)) return null;

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return null;

    return {
      branchName,
      workspacePath: workspace,
      markdownPath: filePath,
      branchContext: loadBranchContext(branchName),
      comparisonBranch,
    };
  }
}
