import * as vscode from 'vscode';
import { TOOL_TASK_TYPE, getToolCommandId, getToolCommandPrefix } from '../../common/constants';
import { getWorkspaceConfigDirPath } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { forEachWorkspaceConfig } from '../../common/utils/config-loader';
import { KeybindingManager } from '../common';

const manager = new KeybindingManager({
  commandPrefix: getToolCommandPrefix(),
  getCommandId: getToolCommandId,
});

export const getToolKeybinding = (name: string) => manager.getKeybinding(name);
export const getAllToolKeybindings = () => manager.getAllKeybindings();
export const reloadToolKeybindings = () => manager.reload();

export function registerToolKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((folder, config) => {
    const tools = config.tools ?? [];

    for (const tool of tools) {
      if (!tool.command) continue;
      const commandId = getToolCommandId(tool.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        const configDirPath = getWorkspaceConfigDirPath(folder);
        const shellExec = new vscode.ShellExecution(tool.command as string, { cwd: configDirPath });
        const task = new vscode.Task({ type: TOOL_TASK_TYPE }, folder, tool.name, TOOL_TASK_TYPE, shellExec);
        void vscode.tasks.executeTask(task);
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}
