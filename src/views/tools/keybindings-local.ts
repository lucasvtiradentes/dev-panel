import * as vscode from 'vscode';
import { TOOL_TASK_TYPE, getGlobalConfigDir, getToolCommandId, getToolCommandPrefix } from '../../common/constants';
import { forEachWorkspaceConfig, getWorkspaceConfigDirPath, loadGlobalConfig } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { registerDynamicCommand } from '../../common/lib/vscode-utils';
import type { ExtensionContext } from '../../common/vscode/vscode-types';
import { KeybindingManager } from '../_view_base';

const manager = new KeybindingManager({
  commandPrefix: getToolCommandPrefix(),
  getCommandId: getToolCommandId,
});

export const getAllToolKeybindings = () => manager.getAllKeybindings();
export const reloadToolKeybindings = () => manager.reload();

export function registerToolKeybindings(context: ExtensionContext) {
  forEachWorkspaceConfig((folder, config) => {
    const tools = config.tools ?? [];

    for (const tool of tools) {
      if (!tool.command) continue;
      const commandId = getToolCommandId(tool.name);
      const disposable = registerDynamicCommand(commandId, () => {
        const configDirPath = getWorkspaceConfigDirPath(folder);
        const shellExec = new vscode.ShellExecution(tool.command as string, { cwd: configDirPath });
        const task = new vscode.Task({ type: TOOL_TASK_TYPE }, folder, tool.name, TOOL_TASK_TYPE, shellExec);
        void vscode.tasks.executeTask(task);
      });
      context.subscriptions.push(disposable);
    }
  });

  const globalConfig = loadGlobalConfig();
  if (globalConfig) {
    const globalTools = globalConfig.tools ?? [];
    const globalConfigDir = getGlobalConfigDir();

    for (const tool of globalTools) {
      if (!tool.command) continue;
      const commandId = getToolCommandId(tool.name);
      const disposable = registerDynamicCommand(commandId, () => {
        const shellExec = new vscode.ShellExecution(tool.command as string, { cwd: globalConfigDir });
        const task = new vscode.Task(
          { type: TOOL_TASK_TYPE },
          vscode.TaskScope.Global,
          tool.name,
          TOOL_TASK_TYPE,
          shellExec,
        );
        void vscode.tasks.executeTask(task);
      });
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
