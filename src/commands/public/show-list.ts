import { Command, registerCommand } from '../../common';
import type { TaskTreeDataProvider } from '../../tree-view';

export function createShowListCommand(taskTreeDataProvider: TaskTreeDataProvider) {
    return registerCommand(Command.ShowList, async () => {
        await taskTreeDataProvider.tabTaskCmd();
    });
}
