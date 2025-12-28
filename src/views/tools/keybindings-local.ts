import { TOOL_TASK_TYPE, getGlobalConfigDir, getToolCommandId, getToolCommandPrefix } from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { registerItemKeybindings } from '../../common/core/keybindings-registration';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { KeybindingManager } from '../_view_base';

const manager = new KeybindingManager({
  commandPrefix: getToolCommandPrefix(),
  getCommandId: getToolCommandId,
});

export const getAllToolKeybindings = () => manager.getAllKeybindings();
export const reloadToolKeybindings = () => manager.reload();

export function registerToolKeybindings(context: ExtensionContext) {
  registerItemKeybindings({
    context,
    getItems: (config) => config.tools,
    getCommandId: getToolCommandId,
    shouldSkip: (tool) => !tool.command,
    createWorkspaceHandler: (tool, folder) => () => {
      const configDirPath = ConfigManager.getWorkspaceConfigDirPath(folder);
      const shellExec = VscodeHelper.createShellExecution(tool.command as string, { cwd: configDirPath });
      const task = VscodeHelper.createTask({
        definition: { type: TOOL_TASK_TYPE },
        scope: folder,
        name: tool.name,
        source: TOOL_TASK_TYPE,
        execution: shellExec,
      });
      void VscodeHelper.executeTask(task);
    },
    createGlobalHandler: (tool) => () => {
      const globalConfigDir = getGlobalConfigDir();
      const shellExec = VscodeHelper.createShellExecution(tool.command as string, { cwd: globalConfigDir });
      const task = VscodeHelper.createTask({
        definition: { type: TOOL_TASK_TYPE },
        scope: VscodeConstants.TaskScope.Global,
        name: tool.name,
        source: TOOL_TASK_TYPE,
        execution: shellExec,
      });
      void VscodeHelper.executeTask(task);
    },
  });
}
