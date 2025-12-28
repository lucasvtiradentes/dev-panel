import { getVariableCommandId, getVariableCommandPrefix } from '../../common/constants';
import { registerItemKeybindings } from '../../common/core/keybindings-registration';
import { Command, executeCommand } from '../../common/vscode/vscode-commands';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { KeybindingManager } from '../_view_base';

const manager = new KeybindingManager({
  commandPrefix: getVariableCommandPrefix(),
  getCommandId: getVariableCommandId,
});

export const getAllVariableKeybindings = () => manager.getAllKeybindings();

export function registerVariableKeybindings(context: ExtensionContext) {
  registerItemKeybindings({
    context,
    getItems: (config) => config.variables,
    getCommandId: getVariableCommandId,
    createWorkspaceHandler: (variable) => () => {
      void executeCommand(Command.SelectConfigOption, variable);
    },
    createGlobalHandler: (variable) => () => {
      void executeCommand(Command.SelectConfigOption, variable);
    },
  });
}
