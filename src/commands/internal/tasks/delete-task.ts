import { ConfigKey, LocationScope } from '../../../common/constants';
import {
  confirmDelete,
  loadGlobalConfig,
  loadWorkspaceConfig,
  removeConfigItem,
  saveGlobalConfig,
  saveWorkspaceConfig,
} from '../../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../../common/lib/vscode-utils';
import {
  isGlobalItem,
  showConfigNotFoundError,
  showDeleteSuccessMessage,
  showInvalidItemError,
  showNoItemsFoundError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import type { TreeTask } from '../../../views/tasks/items';

async function handleDeleteTask(treeTask: TreeTask) {
  if (!treeTask?.taskName) {
    showInvalidItemError('task');
    return;
  }

  const isGlobal = isGlobalItem(treeTask.taskName);
  const taskName = stripGlobalPrefix(treeTask.taskName);

  if (!(await confirmDelete('task', taskName, isGlobal))) return;

  if (isGlobal) {
    const globalConfig = loadGlobalConfig();
    if (!globalConfig) {
      showConfigNotFoundError(LocationScope.Global);
      return;
    }

    if (!globalConfig.tasks?.length) {
      showNoItemsFoundError('task', LocationScope.Global);
      return;
    }

    const removed = removeConfigItem(globalConfig, ConfigKey.Tasks, taskName);
    if (!removed) {
      showNotFoundError('Task', taskName, LocationScope.Global);
      return;
    }

    saveGlobalConfig(globalConfig);
    showDeleteSuccessMessage('task', taskName, true);
    void executeCommand(Command.Refresh);
    return;
  }

  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  if (!workspaceConfig.tasks?.length) {
    showNoItemsFoundError('task', LocationScope.Workspace);
    return;
  }

  const removed = removeConfigItem(workspaceConfig, ConfigKey.Tasks, taskName);
  if (!removed) {
    showNotFoundError('Task', taskName, LocationScope.Workspace);
    return;
  }

  saveWorkspaceConfig(workspaceFolder, workspaceConfig);
  showDeleteSuccessMessage('task', taskName, false);
  void executeCommand(Command.Refresh);
}

export function createDeleteTaskCommand() {
  return registerCommand(Command.DeleteTask, handleDeleteTask);
}
