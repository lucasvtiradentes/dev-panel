import { ConfigKey, LocationScope } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import {
  isGlobalItem,
  showConfigNotFoundError,
  showDeleteSuccessMessage,
  showInvalidItemError,
  showNoItemsFoundError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { TreeTask } from '../../../views/tasks/items';

async function handleDeleteTask(treeTask: TreeTask) {
  if (!treeTask?.taskName) {
    showInvalidItemError('task');
    return;
  }

  const isGlobal = isGlobalItem(treeTask.taskName);
  const taskName = stripGlobalPrefix(treeTask.taskName);

  if (!(await ConfigManager.confirmDelete('task', taskName, isGlobal))) return;

  if (isGlobal) {
    const globalConfig = ConfigManager.loadGlobalConfig();
    if (!globalConfig) {
      showConfigNotFoundError(LocationScope.Global);
      return;
    }

    if (!globalConfig.tasks?.length) {
      showNoItemsFoundError('task', LocationScope.Global);
      return;
    }

    const removed = ConfigManager.removeConfigItem(globalConfig, ConfigKey.Tasks, taskName);
    if (!removed) {
      showNotFoundError('Task', taskName, LocationScope.Global);
      return;
    }

    ConfigManager.saveGlobalConfig(globalConfig);
    showDeleteSuccessMessage('task', taskName, true);
    void executeCommand(Command.Refresh);
    return;
  }

  const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  if (!workspaceConfig.tasks?.length) {
    showNoItemsFoundError('task', LocationScope.Workspace);
    return;
  }

  const removed = ConfigManager.removeConfigItem(workspaceConfig, ConfigKey.Tasks, taskName);
  if (!removed) {
    showNotFoundError('Task', taskName, LocationScope.Workspace);
    return;
  }

  ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);
  showDeleteSuccessMessage('task', taskName, false);
  void executeCommand(Command.Refresh);
}

export function createDeleteTaskCommand() {
  return registerCommand(Command.DeleteTask, handleDeleteTask);
}
