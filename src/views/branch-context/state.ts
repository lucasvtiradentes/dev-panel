import { branchesState } from '../../common/lib/workspace-state';
import type { BranchContext } from '../../common/schemas/types';

export const loadBranchContext = (branchName: string) => branchesState.getBranch(branchName);
export const saveBranchContext = (branchName: string, context: BranchContext) =>
  branchesState.saveBranch(branchName, context);
