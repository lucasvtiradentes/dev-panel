import { getReplacementCommandId } from '../../common/constants';
import { ConfigManager } from '../../common/utils/config-manager';
import { syncKeybindings } from '../../common/utils/keybindings-sync';
import { Command, executeCommand, registerDynamicCommand } from '../../common/vscode/vscode-commands';
import type { ExtensionContext } from '../../common/vscode/vscode-types';

export function registerReplacementKeybindings(context: ExtensionContext) {
  ConfigManager.forEachWorkspaceConfig((_, config) => {
    const replacements = config.replacements ?? [];

    for (const replacement of replacements) {
      const commandId = getReplacementCommandId(replacement.name);
      const disposable = registerDynamicCommand(commandId, () => {
        void executeCommand(Command.ToggleReplacement, replacement);
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}
