import { getVariableCommandId, getVariableCommandPrefix } from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { syncKeybindings } from '../../common/core/keybindings-sync';
import { Command, executeCommand, registerDynamicCommand } from '../../common/vscode/vscode-commands';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { KeybindingManager } from '../_view_base';

const manager = new KeybindingManager({
  commandPrefix: getVariableCommandPrefix(),
  getCommandId: getVariableCommandId,
});

export const getAllVariableKeybindings = () => manager.getAllKeybindings();

export function registerVariableKeybindings(context: ExtensionContext) {
  ConfigManager.forEachWorkspaceConfig((_, config) => {
    const variables = config.variables ?? [];

    for (const variable of variables) {
      const commandId = getVariableCommandId(variable.name);
      const disposable = registerDynamicCommand(commandId, () => {
        void executeCommand(Command.SelectConfigOption, variable);
      });
      context.subscriptions.push(disposable);
    }
  });

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (globalConfig) {
    const globalVariables = globalConfig.variables ?? [];

    for (const variable of globalVariables) {
      const commandId = getVariableCommandId(variable.name);
      const disposable = registerDynamicCommand(commandId, () => {
        void executeCommand(Command.SelectConfigOption, variable);
      });
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
