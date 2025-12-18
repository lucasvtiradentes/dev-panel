import { Command, registerCommand } from '../../common';
import type { TaskTreeDataProvider } from '../../tree-view';

export function createUnhideCommand(taskTreeDataProvider: TaskTreeDataProvider) {
    return registerCommand(Command.Unhide, () => taskTreeDataProvider.unhide());
}
