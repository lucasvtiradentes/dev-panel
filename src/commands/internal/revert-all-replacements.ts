import { Command, registerCommand } from '../../common';
import { revertAllReplacements } from '../../views/replacements';

export function createRevertAllReplacementsCommand() {
  return registerCommand(Command.RevertAllReplacements, revertAllReplacements);
}
