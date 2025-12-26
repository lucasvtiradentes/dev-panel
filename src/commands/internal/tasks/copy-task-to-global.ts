import {
  addOrUpdateConfigItem,
  confirmOverwrite,
  loadGlobalConfig,
  loadWorkspaceConfig,
  saveGlobalConfig,
} from '../../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../../common/lib/vscode-utils';
import {
  isGlobalItem,
  showAlreadyGlobalMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
} from '../../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
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
    showConfigNotFoundError('workspace');
    return;
  }

  const task = workspaceConfig.tasks?.find((t) => t.name === treeTask.taskName);
  if (!task) {
    showNotFoundError('Task', treeTask.taskName, 'workspace');
    return;
  }

  const globalConfig = loadGlobalConfig() ?? {};
  const exists = globalConfig.tasks?.some((t) => t.name === task.name);

  if (exists && !(await confirmOverwrite('Task', task.name))) return;

  addOrUpdateConfigItem(globalConfig, 'tasks', task);
  saveGlobalConfig(globalConfig);

  showCopySuccessMessage('Task', task.name, 'global');
  void executeCommand(Command.Refresh);
}

export function createCopyTaskToGlobalCommand() {
  return registerCommand(Command.CopyTaskToGlobal, handleCopyTaskToGlobal);
}
