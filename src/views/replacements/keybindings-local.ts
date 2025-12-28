import { getReplacementCommandId } from '../../common/constants';
import { registerItemKeybindings } from '../../common/core/keybindings-registration';
import { Command, executeCommand } from '../../common/vscode/vscode-commands';
import type { ExtensionContext } from '../../common/vscode/vscode-types';

export function registerReplacementKeybindings(context: ExtensionContext) {
  registerItemKeybindings({
    context,
    getItems: (config) => config.replacements,
    getCommandId: getReplacementCommandId,
    createWorkspaceHandler: (replacement) => () => {
      void executeCommand(Command.ToggleReplacement, replacement);
    },
    createGlobalHandler: (replacement) => () => {
      void executeCommand(Command.ToggleReplacement, replacement);
    },
  });
}
