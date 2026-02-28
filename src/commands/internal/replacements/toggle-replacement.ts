import type { DevPanelReplacement } from '../../../common/schemas/config-schema';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { toggleReplacement } from '../../../views/replacements';

type ToggleReplacementParams = DevPanelReplacement;

export function createToggleReplacementCommand() {
  return registerCommand(Command.ToggleReplacement, (replacement: ToggleReplacementParams) =>
    toggleReplacement(replacement),
  );
}
