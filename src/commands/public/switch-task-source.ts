import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { TaskTreeDataProvider } from '../../views/tasks';

export function createSwitchTaskSourceCommands(taskTreeDataProvider: TaskTreeDataProvider): vscode.Disposable[] {
  const handler = () => taskTreeDataProvider.switchSource();
  return [
    registerCommand(Command.SwitchTaskSource, handler),
    registerCommand(Command.SwitchTaskSourceFromPackage, handler),
    registerCommand(Command.SwitchTaskSourceFromPP, handler),
  ];
}
