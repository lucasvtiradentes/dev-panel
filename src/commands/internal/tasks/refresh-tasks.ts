import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TaskTreeDataProvider } from '../../../views/tasks';

export function createRefreshCommand(taskTreeDataProvider: TaskTreeDataProvider) {
  return registerCommand(Command.Refresh, () => taskTreeDataProvider.refresh());
}
