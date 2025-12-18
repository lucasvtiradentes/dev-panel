import { Command, registerCommand } from '../../common';
import type { TaskTreeDataProvider } from '../../views/tasks';

export function createShowListCommand(taskTreeDataProvider: TaskTreeDataProvider) {
  return registerCommand(Command.ShowList, async () => {
    await taskTreeDataProvider.tabTaskCmd();
  });
}
