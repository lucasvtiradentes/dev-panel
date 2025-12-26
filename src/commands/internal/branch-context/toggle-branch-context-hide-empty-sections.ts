import type * as vscode from 'vscode';
import { Command, ContextKey, registerCommand, setContextKey } from '../../../common/lib/vscode-utils';
import { branchContextState } from '../../../common/lib/workspace-state';
import type { BranchContextProvider } from '../../../views/branch-context';

export function createToggleBranchContextHideEmptySectionsCommand(
  branchContextProvider: BranchContextProvider,
): vscode.Disposable[] {
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
