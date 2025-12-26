import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { TaskTreeDataProvider } from '../../../views/tasks';

export function createSwitchTaskSourceCommands(taskTreeDataProvider: TaskTreeDataProvider): Disposable[] {
  const handler = () => taskTreeDataProvider.switchSource();
  return [
    registerCommand(Command.SwitchTaskSource, handler),
    registerCommand(Command.SwitchTaskSourceFromPackage, handler),
    registerCommand(Command.SwitchTaskSourceFromDevPanel, handler),
  ];
}
