import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { PPReplacement } from '../../common/schemas/config-schema';
import { toggleReplacement } from '../../views/replacements';

export type ToggleReplacementParams = PPReplacement;

export function createToggleReplacementCommand() {
  return registerCommand(Command.ToggleReplacement, (replacement: ToggleReplacementParams) =>
    toggleReplacement(replacement),
  );
}
