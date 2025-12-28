import { TOOL_TASK_TYPE, getGlobalConfigDir, getToolCommandId, getToolCommandPrefix } from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { syncKeybindings } from '../../common/core/keybindings-sync';
import { registerDynamicCommand } from '../../common/vscode/vscode-commands';
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
  ConfigManager.forEachWorkspaceConfig((folder, config) => {
    const tools = config.tools ?? [];

    for (const tool of tools) {
      if (!tool.command) continue;
      const commandId = getToolCommandId(tool.name);
      const disposable = registerDynamicCommand(commandId, () => {
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
      });
      context.subscriptions.push(disposable);
    }
  });

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (globalConfig) {
    const globalTools = globalConfig.tools ?? [];
    const globalConfigDir = getGlobalConfigDir();

    for (const tool of globalTools) {
      if (!tool.command) continue;
      const commandId = getToolCommandId(tool.name);
      const disposable = registerDynamicCommand(commandId, () => {
        const shellExec = VscodeHelper.createShellExecution(tool.command as string, { cwd: globalConfigDir });
        const task = VscodeHelper.createTask({
          definition: { type: TOOL_TASK_TYPE },
          scope: VscodeConstants.TaskScope.Global,
          name: tool.name,
          source: TOOL_TASK_TYPE,
          execution: shellExec,
        });
        void VscodeHelper.executeTask(task);
      });
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
