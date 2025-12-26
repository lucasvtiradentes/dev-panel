import * as vscode from 'vscode';
import {
  CONFIG_DIR_KEY,
  GLOBAL_TASK_TYPE,
  getGlobalConfigDir,
  getTaskCommandId,
  getTaskCommandPrefix,
} from '../../common/constants';
import { forEachWorkspaceConfig, loadGlobalConfig } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { readDevPanelVariablesAsEnv } from '../../common/utils/variables-env';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { KeybindingManager } from '../_view_base';

const manager = new KeybindingManager({
  commandPrefix: getTaskCommandPrefix(),
  getCommandId: getTaskCommandId,
});

export const getAllTaskKeybindings = () => manager.getAllKeybindings();
export const reloadTaskKeybindings = () => manager.reload();

export function registerTaskKeybindings(context: ExtensionContext) {
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

  const globalConfig = loadGlobalConfig();
  if (globalConfig) {
    const globalTasks = globalConfig.tasks ?? [];
    const globalConfigDir = getGlobalConfigDir();

    for (const task of globalTasks) {
      const commandId = getTaskCommandId(task.name);
      const env = readDevPanelVariablesAsEnv(globalConfigDir);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        const shellExec = new vscode.ShellExecution(task.command, { env, cwd: globalConfigDir });
        const vsTask = new vscode.Task(
          { type: GLOBAL_TASK_TYPE },
          vscode.TaskScope.Global,
          task.name,
          GLOBAL_TASK_TYPE,
          shellExec,
        );
        void vscode.tasks.executeTask(vsTask);
      });
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
