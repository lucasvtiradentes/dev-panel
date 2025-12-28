import { ConfigKey } from '../../../common/constants';
import { ConfigItemOperations } from '../../../common/core/config-item-operations';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { TreeTask } from '../../../views/tasks/items';

async function handleCopyTaskToGlobal(treeTask: TreeTask) {
  if (!treeTask?.taskName) {
    TreeItemUtils.showInvalidItemError('task');
    return;
  }

  if (TreeItemUtils.isGlobalItem(treeTask.taskName)) {
    TreeItemUtils.showAlreadyGlobalMessage('task');
    return;
  }

  await ConfigItemOperations.copyToGlobal({
    itemName: treeTask.taskName,
    itemType: 'Task',
    configKey: ConfigKey.Tasks,
    findInConfig: (config) => config.tasks?.find((t) => t.name === treeTask.taskName),
    existsInConfig: (config, item) => config.tasks?.some((t) => t.name === item.name) ?? false,
    refreshCommand: Command.Refresh,
  });
}

export function createCopyTaskToGlobalCommand() {
  return registerCommand(Command.CopyTaskToGlobal, handleCopyTaskToGlobal);
}
