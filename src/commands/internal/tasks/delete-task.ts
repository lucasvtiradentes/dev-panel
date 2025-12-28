import { ConfigKey } from '../../../common/constants';
import { ConfigItemOperations } from '../../../common/core/config-item-operations';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { TreeTask } from '../../../views/tasks/items';

async function handleDeleteTask(treeTask: TreeTask) {
  if (!treeTask?.taskName) {
    TreeItemUtils.showInvalidItemError('task');
    return;
  }

  const isGlobal = TreeItemUtils.isGlobalItem(treeTask.taskName);
  const taskName = TreeItemUtils.stripGlobalPrefix(treeTask.taskName);

  await ConfigItemOperations.deleteItem({
    itemName: taskName,
    itemType: 'task',
    configKey: ConfigKey.Tasks,
    isGlobal,
    hasItems: (config) => (config.tasks?.length ?? 0) > 0,
    refreshCommand: Command.Refresh,
  });
}

export function createDeleteTaskCommand() {
  return registerCommand(Command.DeleteTask, handleDeleteTask);
}
