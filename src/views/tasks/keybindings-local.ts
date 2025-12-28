import { VariablesEnvManager } from 'src/common/core/variables-env-manager';
import { NodePathHelper } from 'src/common/utils/helpers/node-helper';
import {
  CONFIG_DIR_KEY,
  GLOBAL_TASK_TYPE,
  getGlobalConfigDir,
  getTaskCommandId,
  getTaskCommandPrefix,
} from '../../common/constants';
import { syncKeybindings } from '../../common/core/keybindings-sync';
import { ConfigManager } from '../../common/utils/config-manager';
import { registerDynamicCommand } from '../../common/vscode/vscode-commands';
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
  ConfigManager.forEachWorkspaceConfig((folder, config) => {
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

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (globalConfig) {
    const globalTasks = globalConfig.tasks ?? [];
    const globalConfigDir = getGlobalConfigDir();

    for (const task of globalTasks) {
      const commandId = getTaskCommandId(task.name);
      const variablesPath = NodePathHelper.join(globalConfigDir, 'variables.json5');
      const env = VariablesEnvManager.readDevPanelVariablesAsEnv(variablesPath);
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
