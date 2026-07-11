import { Command, registerCommand } from '../../common/vscode/vscode-commands';
import type { Disposable } from '../../common/vscode/vscode-types';
import { showTasksLocationMenu } from '../../status-bar/status-bar-actions/tasks-location';

export function createChangeTasksLocationCommand(): Disposable {
  return registerCommand(Command.ChangeTasksLocation, () => showTasksLocationMenu());
}
