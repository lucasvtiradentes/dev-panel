import { ConfigKey, LocationScope } from '../../../common/constants';
import { ConfigManager } from '../../../common/utils/config-manager';
import {
  isGlobalItem,
  showAlreadyWorkspaceMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-utils';
import { selectWorkspaceFolder } from '../../../common/vscode/workspace-utils';
import type { TreeTask } from '../../../views/tasks/items';

async function handleCopyTaskToWorkspace(treeTask: TreeTask) {
  if (!treeTask?.taskName) {
    showInvalidItemError('task');
    return;
  }

  if (!isGlobalItem(treeTask.taskName)) {
    showAlreadyWorkspaceMessage('task');
    return;
  }

  const taskName = stripGlobalPrefix(treeTask.taskName);

  const workspaceFolder = await selectWorkspaceFolder('Select workspace to copy task to');
  if (!workspaceFolder) return;

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (!globalConfig) {
    showConfigNotFoundError(LocationScope.Global);
    return;
  }

  const task = globalConfig.tasks?.find((t) => t.name === taskName);
  if (!task) {
    showNotFoundError('Task', taskName, LocationScope.Global);
    return;
  }

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder) ?? {};
  const exists = workspaceConfig.tasks?.some((t) => t.name === task.name);

  if (exists && !(await ConfigManager.confirmOverwrite('Task', task.name))) return;

  ConfigManager.addOrUpdateConfigItem(workspaceConfig, ConfigKey.Tasks, task);
  ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  showCopySuccessMessage('Task', task.name, LocationScope.Workspace);
  void executeCommand(Command.Refresh);
}

export function createCopyTaskToWorkspaceCommand() {
  return registerCommand(Command.CopyTaskToWorkspace, handleCopyTaskToWorkspace);
}
