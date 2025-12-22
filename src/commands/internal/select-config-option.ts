import { Command, registerCommand } from '../../common/lib/vscode-utils';
import { type VariableTreeItem, resetVariableOption, selectVariableOption } from '../../views/variables';

export function createSelectConfigOptionCommand() {
  return registerCommand(Command.SelectConfigOption, selectVariableOption);
}

export function createResetConfigOptionCommand() {
  return registerCommand(Command.ResetConfigOption, (item: VariableTreeItem) => resetVariableOption(item));
}
