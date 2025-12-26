import {
  addOrUpdateConfigItem,
  confirmOverwrite,
  loadGlobalConfig,
  loadWorkspaceConfig,
  saveWorkspaceConfig,
} from '../../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../../common/lib/vscode-utils';
import {
  isGlobalItem,
  showAlreadyWorkspaceMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { selectWorkspaceFolder } from '../../../common/utils/workspace-utils';
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

  const globalConfig = loadGlobalConfig();
  if (!globalConfig) {
    showConfigNotFoundError('global');
    return;
  }

  const task = globalConfig.tasks?.find((t) => t.name === taskName);
  if (!task) {
    showNotFoundError('Task', taskName, 'global');
    return;
  }

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder) ?? {};
  const exists = workspaceConfig.tasks?.some((t) => t.name === task.name);

  if (exists && !(await confirmOverwrite('Task', task.name))) return;

  addOrUpdateConfigItem(workspaceConfig, 'tasks', task);
  saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  showCopySuccessMessage('Task', task.name, 'workspace');
  void executeCommand(Command.Refresh);
}

export function createCopyTaskToWorkspaceCommand() {
  return registerCommand(Command.CopyTaskToWorkspace, handleCopyTaskToWorkspace);
}
