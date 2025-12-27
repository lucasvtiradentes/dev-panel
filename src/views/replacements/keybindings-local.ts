import { getReplacementCommandId } from '../../common/constants';
import { ConfigManager } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { Command, executeCommand, registerDynamicCommand } from '../../common/vscode/vscode-utils';

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
