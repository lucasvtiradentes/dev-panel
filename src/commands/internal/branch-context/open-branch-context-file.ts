import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { BranchContextProvider } from '../../../views/branch-context';

export function createOpenBranchContextFileCommand(branchContextProvider: BranchContextProvider): Disposable {
  return registerCommand(Command.OpenBranchContextFile, () => branchContextProvider.openMarkdownFile());
}
