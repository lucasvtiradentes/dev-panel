import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { type ExcludeTreeItem, refreshExcludes, removeExcludeEntry } from '../../../views/excludes';

export function createRemoveExcludeCommand(): Disposable {
  return registerCommand(Command.RemoveExclude, (item?: ExcludeTreeItem) => {
    if (!item?.entry) return;

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    removeExcludeEntry(workspace, item.entry.id);
    refreshExcludes();
  });
}
