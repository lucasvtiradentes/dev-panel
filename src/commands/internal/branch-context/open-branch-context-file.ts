import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchContextProvider } from '../../../views/branch-context';

export function createOpenBranchContextFileCommand(branchContextProvider: BranchContextProvider): Disposable {
  return registerCommand(Command.OpenBranchContextFile, () => branchContextProvider.openMarkdownFile());
}
