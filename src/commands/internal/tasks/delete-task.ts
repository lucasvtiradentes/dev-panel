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

async function handleDeleteTask(treeTask: TreeTask): Promise<void> {
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
      showConfigNotFoundError('global');
      return;
    }

    if (!globalConfig.tasks?.length) {
      showNoItemsFoundError('task', 'global');
      return;
    }

    const removed = removeConfigItem(globalConfig, 'tasks', taskName);
    if (!removed) {
      showNotFoundError('Task', taskName, 'global');
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
    showConfigNotFoundError('workspace');
    return;
  }

  if (!workspaceConfig.tasks?.length) {
    showNoItemsFoundError('task', 'workspace');
    return;
  }

  const removed = removeConfigItem(workspaceConfig, 'tasks', taskName);
  if (!removed) {
    showNotFoundError('Task', taskName, 'workspace');
    return;
  }

  saveWorkspaceConfig(workspaceFolder, workspaceConfig);
  showDeleteSuccessMessage('task', taskName, false);
  void executeCommand(Command.Refresh);
}

export function createDeleteTaskCommand() {
  return registerCommand(Command.DeleteTask, handleDeleteTask);
}
