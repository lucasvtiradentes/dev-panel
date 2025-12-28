import { ConfigKey, LocationScope } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { TreeTask } from '../../../views/tasks/items';

async function handleCopyTaskToWorkspace(treeTask: TreeTask) {
  if (!treeTask?.taskName) {
    TreeItemUtils.showInvalidItemError('task');
    return;
  }

  if (!TreeItemUtils.isGlobalItem(treeTask.taskName)) {
    TreeItemUtils.showAlreadyWorkspaceMessage('task');
    return;
  }

  const taskName = TreeItemUtils.stripGlobalPrefix(treeTask.taskName);

  const workspaceFolder = await VscodeHelper.selectWorkspaceFolder('Select workspace to copy task to');
  if (!workspaceFolder) return;

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (!globalConfig) {
    TreeItemUtils.showConfigNotFoundError(LocationScope.Global);
    return;
  }

  const task = globalConfig.tasks?.find((t) => t.name === taskName);
  if (!task) {
    TreeItemUtils.showNotFoundError('Task', taskName, LocationScope.Global);
    return;
  }

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder) ?? {};
  const exists = workspaceConfig.tasks?.some((t) => t.name === task.name);

  if (exists && !(await ConfigManager.confirmOverwrite('Task', task.name))) return;

  ConfigManager.addOrUpdateConfigItem(workspaceConfig, ConfigKey.Tasks, task);
  ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  TreeItemUtils.showCopySuccessMessage('Task', task.name, LocationScope.Workspace);
  void executeCommand(Command.Refresh);
}

export function createCopyTaskToWorkspaceCommand() {
  return registerCommand(Command.CopyTaskToWorkspace, handleCopyTaskToWorkspace);
}
