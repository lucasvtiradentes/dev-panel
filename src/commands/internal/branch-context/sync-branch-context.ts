import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchContextProvider } from '../../../views/branch-context';

export function createSyncBranchContextCommand(branchContextProvider: BranchContextProvider): Disposable {
  return registerCommand(Command.SyncBranchContext, () => branchContextProvider.syncBranchContext());
}
