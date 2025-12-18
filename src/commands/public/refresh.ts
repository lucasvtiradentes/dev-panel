import { Command, registerCommand } from '../../common';
import type { TaskTreeDataProvider } from '../../tree-view';

export function createRefreshCommand(taskTreeDataProvider: TaskTreeDataProvider) {
    return registerCommand(Command.Refresh, () => taskTreeDataProvider.refresh());
}
