import { getGlobalPromptFilePath, getPromptCommandId, getPromptCommandPrefix } from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { registerItemKeybindings } from '../../common/core/keybindings-registration';
import { Command, executeCommand } from '../../common/vscode/vscode-commands';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { KeybindingManager } from '../_view_base';

const manager = new KeybindingManager({
  commandPrefix: getPromptCommandPrefix(),
  getCommandId: getPromptCommandId,
});

export const getAllPromptKeybindings = () => manager.getAllKeybindings();
export const reloadPromptKeybindings = () => manager.reload();

export function registerPromptKeybindings(context: ExtensionContext) {
  registerItemKeybindings({
    context,
    getItems: (config) => config.prompts,
    getCommandId: getPromptCommandId,
    createWorkspaceHandler: (prompt, folder) => () => {
      const promptFilePath = ConfigManager.getWorkspacePromptFilePath(folder, prompt.file);
      void executeCommand(Command.ExecutePrompt, { promptFilePath, folder, promptConfig: prompt });
    },
    createGlobalHandler: (prompt) => () => {
      const promptFilePath = getGlobalPromptFilePath(prompt.file);
      void executeCommand(Command.ExecutePrompt, { promptFilePath, folder: null, promptConfig: prompt });
    },
  });
}
