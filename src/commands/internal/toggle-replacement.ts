import { Command, registerCommand } from '../../common/lib/vscode-utils';
import { toggleReplacement } from '../../views/replacements';

export function createToggleReplacementCommand() {
  return registerCommand(Command.ToggleReplacement, toggleReplacement);
}
