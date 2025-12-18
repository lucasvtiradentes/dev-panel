import { Command, registerCommand } from '../../common';
import { toggleReplacement } from '../../views/replacements';

export function createToggleReplacementCommand() {
  return registerCommand(Command.ToggleReplacement, toggleReplacement);
}
