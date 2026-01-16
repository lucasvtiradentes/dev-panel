import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { type BranchChangedFilesProvider, ChangedFileItem, type FileStatus } from '../../../views/branch-changed-files';

export function createBranchChangedFilesCommands(branchChangedFilesProvider: BranchChangedFilesProvider): Disposable[] {
  return [
    registerCommand(Command.ToggleBranchChangedFilesGroupMode, () => branchChangedFilesProvider.toggleGroupMode()),
    registerCommand(Command.ToggleBranchChangedFilesGroupModeGrouped, () =>
      branchChangedFilesProvider.toggleGroupMode(),
    ),
    registerCommand(Command.SyncBranchChangedFiles, () => branchChangedFilesProvider.syncChangedFiles()),
    registerCommand(Command.OpenChangedFile, (item: ChangedFileItem | string) => {
      const filePath = item instanceof ChangedFileItem ? item.node.path : item;
      return branchChangedFilesProvider.openFile(filePath);
    }),
    registerCommand(Command.OpenChangedFileDiff, (filePath: string, status: FileStatus) =>
      branchChangedFilesProvider.openDiff(filePath, status),
    ),
  ];
}
