import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import {
  type GitExcludeTreeItem,
  addExcludeEntry,
  refreshGitExcludes,
  removeExcludeEntry,
} from '../../../views/git-excludes';

export function createToggleExcludeCommand(): Disposable {
  return registerCommand(Command.ToggleExclude, (item?: GitExcludeTreeItem) => {
    if (!item) return;
    const workspace = VscodeHelper.getActiveWorkspacePath();
    if (!workspace) return;

    if (item.excluded && item.entry) removeExcludeEntry(workspace, item.entry.id);
    else addExcludeEntry(workspace, item.pattern);
    refreshGitExcludes();
  });
}
