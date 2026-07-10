import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { type ExcludeTreeItem, addExcludeEntry, refreshExcludes, removeExcludeEntry } from '../../../views/excludes';

export function createToggleExcludeCommand(): Disposable {
  return registerCommand(Command.ToggleExclude, (item?: ExcludeTreeItem) => {
    if (!item) return;
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    if (item.excluded && item.entry) removeExcludeEntry(workspace, item.entry.id);
    else addExcludeEntry(workspace, item.pattern);
    refreshExcludes();
  });
}
