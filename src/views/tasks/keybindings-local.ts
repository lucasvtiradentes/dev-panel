import * as vscode from 'vscode';
import { CONFIG_DIR_KEY, getTaskCommandId, getTaskCommandPrefix } from '../../common/constants';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { forEachWorkspaceConfig } from '../../common/utils/config-loader';
import { KeybindingManager } from '../common';

const manager = new KeybindingManager({
  commandPrefix: getTaskCommandPrefix(),
  getCommandId: getTaskCommandId,
});

export const getTaskKeybinding = (name: string) => manager.getKeybinding(name);
export const getAllTaskKeybindings = () => manager.getAllKeybindings();
export const reloadTaskKeybindings = () => manager.reload();

export function registerTaskKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((folder, config) => {
    const tasks = config.tasks ?? [];

    for (const task of tasks) {
      const commandId = getTaskCommandId(task.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        const shellExec = new vscode.ShellExecution(task.command);
        const vsTask = new vscode.Task({ type: CONFIG_DIR_KEY }, folder, task.name, CONFIG_DIR_KEY, shellExec);
        void vscode.tasks.executeTask(vsTask);
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}
