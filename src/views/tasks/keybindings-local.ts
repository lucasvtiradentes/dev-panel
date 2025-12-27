import {
  CONFIG_DIR_KEY,
  GLOBAL_TASK_TYPE,
  getGlobalConfigDir,
  getTaskCommandId,
  getTaskCommandPrefix,
} from '../../common/constants';
import { forEachWorkspaceConfig, loadGlobalConfig } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { registerDynamicCommand } from '../../common/lib/vscode-utils';
import { readDevPanelVariablesAsEnv } from '../../common/utils/variables-env';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
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
      const disposable = registerDynamicCommand(commandId, () => {
        const shellExec = VscodeHelper.createShellExecution(task.command);
        const vsTask = VscodeHelper.createTask({ type: CONFIG_DIR_KEY }, folder, task.name, CONFIG_DIR_KEY, shellExec);
        void VscodeHelper.executeTask(vsTask);
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
      const variablesPath = require('node:path').join(globalConfigDir, 'variables.json5');
      const env = readDevPanelVariablesAsEnv(variablesPath);
      const disposable = registerDynamicCommand(commandId, () => {
        const shellExec = VscodeHelper.createShellExecution(task.command, { env, cwd: globalConfigDir });
        const vsTask = VscodeHelper.createTask(
          { type: GLOBAL_TASK_TYPE },
          VscodeConstants.TaskScope.Global,
          task.name,
          GLOBAL_TASK_TYPE,
          shellExec,
        );
        void VscodeHelper.executeTask(vsTask);
      });
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
