import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, ContextKey, registerCommand, setContextKey } from '../../../common/vscode/vscode-utils';
import { branchContextState } from '../../../common/workspace-state';
import type { BranchContextProvider } from '../../../views/branch-context';

export function createToggleBranchContextHideEmptySectionsCommand(
  branchContextProvider: BranchContextProvider,
): Disposable[] {
  return [
    registerCommand(Command.ToggleBranchContextHideEmptySections, () => {
      branchContextState.saveHideEmptySections(true);
      void setContextKey(ContextKey.BranchContextHideEmptySections, true);
      branchContextProvider.refresh();
    }),
    registerCommand(Command.ToggleBranchContextHideEmptySectionsActive, () => {
      branchContextState.saveHideEmptySections(false);
      void setContextKey(ContextKey.BranchContextHideEmptySections, false);
      branchContextProvider.refresh();
    }),
  ];
}
