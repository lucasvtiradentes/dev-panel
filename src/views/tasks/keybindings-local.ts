import { VariablesEnvManager } from 'src/common/core/variables-env-manager';
import { getTaskCommandId, getTaskCommandPrefix } from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { registerItemKeybindings } from '../../common/core/keybindings-registration';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { KeybindingManager } from '../_view_base';
import { executeTaskFromKeybinding } from './task-executor';

const manager = new KeybindingManager({
  commandPrefix: getTaskCommandPrefix(),
  getCommandId: getTaskCommandId,
});

export const getTaskKeybinding = (taskName: string) => manager.getKeybinding(taskName);
export const reloadTaskKeybindings = () => manager.reload();

export function registerTaskKeybindings(context: ExtensionContext) {
  registerItemKeybindings({
    context,
    getItems: (config) => config.tasks,
    getCommandId: getTaskCommandId,
    createWorkspaceHandler: (task, folder) => () => {
      const config = ConfigManager.loadWorkspaceConfig(folder);
      const currentTask = config?.tasks?.find((t) => t.name === task.name);
      if (!currentTask) return;

      const configDirPath = ConfigManager.getWorkspaceConfigDirPath(folder);
      const cwd = currentTask.useConfigDir ? configDirPath : folder.uri.fsPath;
      const env = VariablesEnvManager.readDevPanelVariablesAsEnv(ConfigManager.getWorkspaceVariablesPath(folder));

      void executeTaskFromKeybinding({ task: currentTask, cwd, env });
    },
  });
}
