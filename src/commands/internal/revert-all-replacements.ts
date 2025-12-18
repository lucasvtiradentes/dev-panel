import { Command, registerCommand } from '../../common';
import { revertAllReplacements } from '../../views/hello2';

export function createRevertAllReplacementsCommand() {
  return registerCommand(Command.RevertAllReplacements, revertAllReplacements);
}
