import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { BranchContextProvider } from '../../../views/branch-context';

export function createOpenBranchContextFileCommand(branchContextProvider: BranchContextProvider): vscode.Disposable {
  return registerCommand(Command.OpenBranchContextFile, () => branchContextProvider.openMarkdownFile());
}
