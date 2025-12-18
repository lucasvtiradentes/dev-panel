import { Command, registerCommand } from '../../common';
import { toggleReplacement } from '../../views/hello2';

export function createToggleReplacementCommand() {
  return registerCommand(Command.ToggleReplacement, toggleReplacement);
}
