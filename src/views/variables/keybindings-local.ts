import * as vscode from 'vscode';
import { getVariableCommandId, getVariableCommandPrefix } from '../../common/constants';
import { forEachWorkspaceConfig, loadGlobalConfig } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { Command, executeCommand } from '../../common/lib/vscode-utils';
import { KeybindingManager } from '../_base';

const manager = new KeybindingManager({
  commandPrefix: getVariableCommandPrefix(),
  getCommandId: getVariableCommandId,
});

export const getAllVariableKeybindings = () => manager.getAllKeybindings();

export function registerVariableKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((_folder, config) => {
    const variables = config.variables ?? [];

    for (const variable of variables) {
      const commandId = getVariableCommandId(variable.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.SelectConfigOption, variable);
      });
      context.subscriptions.push(disposable);
    }
  });

  const globalConfig = loadGlobalConfig();
  if (globalConfig) {
    const globalVariables = globalConfig.variables ?? [];

    for (const variable of globalVariables) {
      const commandId = getVariableCommandId(variable.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.SelectConfigOption, variable);
      });
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
