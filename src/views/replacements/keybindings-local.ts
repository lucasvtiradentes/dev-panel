import * as vscode from 'vscode';
import { getReplacementCommandId } from '../../common/constants';
import { forEachWorkspaceConfig } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { Command, executeCommand } from '../../common/lib/vscode-utils';

export function registerReplacementKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((_folder, config) => {
    const replacements = config.replacements ?? [];

    for (const replacement of replacements) {
      const commandId = getReplacementCommandId(replacement.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.ToggleReplacement, replacement);
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}
