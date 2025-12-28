import { getGlobalPromptFilePath, getPromptCommandId, getPromptCommandPrefix } from '../../common/constants';
import { syncKeybindings } from '../../common/core/keybindings-sync';
import { ConfigManager } from '../../common/utils/config-manager';
import { Command, executeCommand, registerDynamicCommand } from '../../common/vscode/vscode-commands';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { KeybindingManager } from '../_view_base';

const manager = new KeybindingManager({
  commandPrefix: getPromptCommandPrefix(),
  getCommandId: getPromptCommandId,
});

export const getAllPromptKeybindings = () => manager.getAllKeybindings();
export const reloadPromptKeybindings = () => manager.reload();

export function registerPromptKeybindings(context: ExtensionContext) {
  ConfigManager.forEachWorkspaceConfig((folder, config) => {
    const prompts = config.prompts ?? [];

    for (const prompt of prompts) {
      const commandId = getPromptCommandId(prompt.name);
      const promptFilePath = ConfigManager.getWorkspacePromptFilePath(folder, prompt.file);
      const disposable = registerDynamicCommand(commandId, () => {
        void executeCommand(Command.ExecutePrompt, { promptFilePath, folder, promptConfig: prompt });
      });
      context.subscriptions.push(disposable);
    }
  });

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (globalConfig) {
    const globalPrompts = globalConfig.prompts ?? [];

    for (const prompt of globalPrompts) {
      const commandId = getPromptCommandId(prompt.name);
      const promptFilePath = getGlobalPromptFilePath(prompt.file);
      const disposable = registerDynamicCommand(commandId, () => {
        void executeCommand(Command.ExecutePrompt, { promptFilePath, folder: null, promptConfig: prompt });
      });
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
