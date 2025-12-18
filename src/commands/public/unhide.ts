import { Command, registerCommand } from '../../common';
import type { TaskTreeDataProvider } from '../../views/tasks';

export function createUnhideCommand(taskTreeDataProvider: TaskTreeDataProvider) {
    return registerCommand(Command.Unhide, () => taskTreeDataProvider.unhide());
}
