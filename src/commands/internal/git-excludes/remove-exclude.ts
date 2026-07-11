import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { type GitExcludeTreeItem, refreshGitExcludes, removeExcludeEntry } from '../../../views/git-excludes';

export function createRemoveExcludeCommand(): Disposable {
  return registerCommand(Command.RemoveExclude, (item?: GitExcludeTreeItem) => {
    if (!item?.entry) return;

    const workspace = VscodeHelper.getActiveWorkspacePath();
    if (!workspace) return;

    removeExcludeEntry(workspace, item.entry.id);
    refreshGitExcludes();
  });
}
