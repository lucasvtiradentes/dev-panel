import { Command, registerCommand } from '../../common';
import { type ConfigTreeItem, resetConfigOption, selectConfigOption } from '../../views/configs';

export function createSelectConfigOptionCommand() {
  return registerCommand(Command.SelectConfigOption, selectConfigOption);
}

export function createResetConfigOptionCommand() {
  return registerCommand(Command.ResetConfigOption, (item: ConfigTreeItem) => resetConfigOption(item));
}
