import * as vscode from 'vscode';
import { getGlobalConfigDir, getPromptCommandId, getPromptCommandPrefix } from '../../common/constants';
import { forEachWorkspaceConfig, getWorkspaceConfigDirPath, loadGlobalConfig } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { Command, executeCommand } from '../../common/lib/vscode-utils';
import { KeybindingManager } from '../_base';

const manager = new KeybindingManager({
  commandPrefix: getPromptCommandPrefix(),
  getCommandId: getPromptCommandId,
});

export const getAllPromptKeybindings = () => manager.getAllKeybindings();
export const reloadPromptKeybindings = () => manager.reload();

export function registerPromptKeybindings(context: vscode.ExtensionContext) {
  forEachWorkspaceConfig((folder, config) => {
    const prompts = config.prompts ?? [];

    for (const prompt of prompts) {
      const commandId = getPromptCommandId(prompt.name);
      const configDirPath = getWorkspaceConfigDirPath(folder);
      const promptFilePath = `${configDirPath}/${prompt.file}`;
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.ExecutePrompt, { promptFilePath, folder, promptConfig: prompt });
      });
      context.subscriptions.push(disposable);
    }
  });

  const globalConfig = loadGlobalConfig();
  if (globalConfig) {
    const globalPrompts = globalConfig.prompts ?? [];
    const globalConfigDir = getGlobalConfigDir();

    for (const prompt of globalPrompts) {
      const commandId = getPromptCommandId(prompt.name);
      const promptFilePath = `${globalConfigDir}/${prompt.file}`;
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.ExecutePrompt, { promptFilePath, folder: null, promptConfig: prompt });
      });
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
