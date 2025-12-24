import * as vscode from 'vscode';
import { getPromptCommandId, getPromptCommandPrefix } from '../../common/constants';
import { getWorkspaceConfigDirPath } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { Command, executeCommand } from '../../common/lib/vscode-utils';
import { forEachWorkspaceConfig } from '../../common/utils/config-loader';
import { KeybindingManager } from '../common';

const manager = new KeybindingManager({
  commandPrefix: getPromptCommandPrefix(),
  getCommandId: getPromptCommandId,
});

export const getPromptKeybinding = (name: string) => manager.getKeybinding(name);
export const getAllPromptKeybindings = () => manager.getAllKeybindings();
export const reloadPromptKeybindings = () => manager.reload();

export function registerPromptKeybindings(context: vscode.ExtensionContext): void {
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
  syncKeybindings();
}
