import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { VariablesProvider } from '../../../views/variables';

export function createToggleVariablesViewCommands(variablesProvider: VariablesProvider): Disposable[] {
  return [
    registerCommand(Command.ToggleConfigsGroupMode, () => variablesProvider.toggleGroupMode()),
    registerCommand(Command.ToggleConfigsGroupModeGrouped, () => variablesProvider.toggleGroupMode()),
  ];
}
