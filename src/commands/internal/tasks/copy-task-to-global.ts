import { ConfigKey, LocationScope } from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import {
  isGlobalItem,
  showAlreadyGlobalMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
} from '../../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TreeTask } from '../../../views/tasks/items';

async function handleCopyTaskToGlobal(treeTask: TreeTask) {
  if (!treeTask?.taskName) {
    showInvalidItemError('task');
    return;
  }

  if (isGlobalItem(treeTask.taskName)) {
    showAlreadyGlobalMessage('task');
    return;
  }

  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  const task = workspaceConfig.tasks?.find((t) => t.name === treeTask.taskName);
  if (!task) {
    showNotFoundError('Task', treeTask.taskName, LocationScope.Workspace);
    return;
  }

  const globalConfig = ConfigManager.loadGlobalConfig() ?? {};
  const exists = globalConfig.tasks?.some((t) => t.name === task.name);

  if (exists && !(await ConfigManager.confirmOverwrite('Task', task.name))) return;

  ConfigManager.addOrUpdateConfigItem(globalConfig, ConfigKey.Tasks, task);
  ConfigManager.saveGlobalConfig(globalConfig);

  showCopySuccessMessage('Task', task.name, LocationScope.Global);
  void executeCommand(Command.Refresh);
}

export function createCopyTaskToGlobalCommand() {
  return registerCommand(Command.CopyTaskToGlobal, handleCopyTaskToGlobal);
}
