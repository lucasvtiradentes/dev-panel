import { branchesState } from '../../common/lib/workspace-state';
import type { BranchContext } from '../../common/types';

export const loadBranchContext = (branchName: string) => branchesState.getBranch(branchName);
export const saveBranchContext = (branchName: string, context: BranchContext) =>
  branchesState.saveBranch(branchName, context);
export const updateBranchField = (branchName: string, field: keyof BranchContext, value: string | undefined) =>
  branchesState.updateField(branchName, field, value);
