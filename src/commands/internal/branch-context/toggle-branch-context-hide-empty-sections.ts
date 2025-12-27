import { branchContextState } from '../../../common/state';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, ContextKey, registerCommand, setContextKey } from '../../../common/vscode/vscode-utils';
import type { BranchContextProvider } from '../../../views/branch-context';

function handleToggleHideEmptySections(branchContextProvider: BranchContextProvider, hideValue: boolean) {
  branchContextState.saveHideEmptySections(hideValue);
  void setContextKey(ContextKey.BranchContextHideEmptySections, hideValue);
  branchContextProvider.refresh();
}

export function createToggleBranchContextHideEmptySectionsCommand(
  branchContextProvider: BranchContextProvider,
): Disposable[] {
  return [
    registerCommand(Command.ToggleBranchContextHideEmptySections, () =>
      handleToggleHideEmptySections(branchContextProvider, true),
    ),
    registerCommand(Command.ToggleBranchContextHideEmptySectionsActive, () =>
      handleToggleHideEmptySections(branchContextProvider, false),
    ),
  ];
}
