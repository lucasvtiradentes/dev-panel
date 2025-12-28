import { VariablesEnvManager } from 'src/common/core/variables-env-manager';
import { NodePathHelper } from 'src/common/utils/helpers/node-helper';
import {
  CONFIG_DIR_KEY,
  GLOBAL_TASK_TYPE,
  getGlobalConfigDir,
  getTaskCommandId,
  getTaskCommandPrefix,
} from '../../common/constants';
import { registerItemKeybindings } from '../../common/core/keybindings-registration';
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
  registerItemKeybindings({
    context,
    getItems: (config) => config.tasks,
    getCommandId: getTaskCommandId,
    createWorkspaceHandler: (task, folder) => () => {
      const shellExec = VscodeHelper.createShellExecution(task.command);
      const vsTask = VscodeHelper.createTask({
        definition: { type: CONFIG_DIR_KEY },
        scope: folder,
        name: task.name,
        source: CONFIG_DIR_KEY,
        execution: shellExec,
      });
      void VscodeHelper.executeTask(vsTask);
    },
    createGlobalHandler: (task) => {
      const globalConfigDir = getGlobalConfigDir();
      const variablesPath = NodePathHelper.join(globalConfigDir, 'variables.json5');
      const env = VariablesEnvManager.readDevPanelVariablesAsEnv(variablesPath);

      return () => {
        const shellExec = VscodeHelper.createShellExecution(task.command, { env, cwd: globalConfigDir });
        const vsTask = VscodeHelper.createTask({
          definition: { type: GLOBAL_TASK_TYPE },
          scope: VscodeConstants.TaskScope.Global,
          name: task.name,
          source: GLOBAL_TASK_TYPE,
          execution: shellExec,
        });
        void VscodeHelper.executeTask(vsTask);
      };
    },
  });
}
