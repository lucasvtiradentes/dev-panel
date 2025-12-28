import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { TaskTreeDataProvider } from '../../../views/tasks';

export function createRefreshCommand(taskTreeDataProvider: TaskTreeDataProvider) {
  return registerCommand(Command.Refresh, () => taskTreeDataProvider.refresh());
}
