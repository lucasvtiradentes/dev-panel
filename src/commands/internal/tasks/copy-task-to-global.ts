import { ConfigKey, LocationScope } from '../../../common/constants';
import {
  addOrUpdateConfigItem,
  confirmOverwrite,
  loadGlobalConfig,
  loadWorkspaceConfig,
  saveGlobalConfig,
} from '../../../common/lib/config-manager';
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

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  const task = workspaceConfig.tasks?.find((t) => t.name === treeTask.taskName);
  if (!task) {
    showNotFoundError('Task', treeTask.taskName, LocationScope.Workspace);
    return;
  }

  const globalConfig = loadGlobalConfig() ?? {};
  const exists = globalConfig.tasks?.some((t) => t.name === task.name);

  if (exists && !(await confirmOverwrite('Task', task.name))) return;

  addOrUpdateConfigItem(globalConfig, ConfigKey.Tasks, task);
  saveGlobalConfig(globalConfig);

  showCopySuccessMessage('Task', task.name, LocationScope.Global);
  void executeCommand(Command.Refresh);
}

export function createCopyTaskToGlobalCommand() {
  return registerCommand(Command.CopyTaskToGlobal, handleCopyTaskToGlobal);
}
