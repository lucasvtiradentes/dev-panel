import * as vscode from 'vscode';
import { BRANCH_TYPES, type BranchType } from '../../common/constants';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { BranchContextProvider } from '../../views/branch-context';

export function createToggleBranchTypeCommand(branchContextProvider: BranchContextProvider): vscode.Disposable {
  return registerCommand(Command.ToggleBranchType, async () => {
    const items: vscode.QuickPickItem[] = BRANCH_TYPES.map((type) => ({
      label: type,
      description: type === 'other' ? 'No specific type' : `Branch type: ${type}`,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select branch type',
      title: 'Branch Type',
    });

    if (selected) {
      await branchContextProvider.setBranchType(selected.label as BranchType);
    }
  });
}
