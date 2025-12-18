import { Command, registerCommand } from '../../common';
import { selectConfigOption } from '../../views/configs';

export function createSelectConfigOptionCommand() {
  return registerCommand(Command.SelectConfigOption, selectConfigOption);
}
