import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TaskTreeDataProvider } from '../../../views/tasks';

export function createSwitchTaskSourceCommands(taskTreeDataProvider: TaskTreeDataProvider): Disposable[] {
  const handler = () => taskTreeDataProvider.switchSource();
  return [
    registerCommand(Command.SwitchTaskSource, handler),
    registerCommand(Command.SwitchTaskSourceFromPackage, handler),
    registerCommand(Command.SwitchTaskSourceFromDevPanel, handler),
  ];
}
