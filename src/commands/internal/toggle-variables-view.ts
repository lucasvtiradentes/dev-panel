import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { VariablesProvider } from '../../views/variables';

export function createToggleVariablesViewCommands(variablesProvider: VariablesProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.ToggleConfigsGroupMode, () => variablesProvider.toggleGroupMode()),
    registerCommand(Command.ToggleConfigsGroupModeGrouped, () => variablesProvider.toggleGroupMode()),
  ];
}
