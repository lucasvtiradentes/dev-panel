import { Command, registerCommand } from '../../common/lib/vscode-utils';
import { revertAllReplacements } from '../../views/replacements';

export function createRevertAllReplacementsCommand() {
  return registerCommand(Command.RevertAllReplacements, revertAllReplacements);
}
