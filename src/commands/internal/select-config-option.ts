import { Command, registerCommand } from '../../common';
import { selectConfigOption } from '../../views/hello1';

export function createSelectConfigOptionCommand() {
  return registerCommand(Command.SelectConfigOption, selectConfigOption);
}
