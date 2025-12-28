import { ConfigKey, getGlobalToolDir } from '../../../common/constants';
import { ConfigItemOperations } from '../../../common/core/config-item-operations';
import { type ConfigArrayItem, ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { TreeTool } from '../../../views/tools/items';

async function handleDeleteTool(treeTool: TreeTool) {
  if (!treeTool?.toolName) {
    TreeItemUtils.showInvalidItemError('tool');
    return;
  }

  const isGlobal = TreeItemUtils.isGlobalItem(treeTool.toolName);
  const toolName = TreeItemUtils.stripGlobalPrefix(treeTool.toolName);

  await ConfigItemOperations.deleteItem<ConfigArrayItem>({
    itemName: toolName,
    itemType: 'tool',
    configKey: ConfigKey.Tools,
    isGlobal,
    hasItems: (config) => (config.tools?.length ?? 0) > 0,
    onDeleteSideEffect: (item, isGlobalItem, workspaceFolder) => {
      if (isGlobalItem) {
        const globalToolsDir = getGlobalToolDir(item.name);
        FileIOHelper.deleteDirectory(globalToolsDir);
      } else if (workspaceFolder) {
        const workspaceToolsDir = ConfigManager.getWorkspaceToolDir(workspaceFolder, item.name);
        FileIOHelper.deleteDirectory(workspaceToolsDir);
      }
    },
    refreshCommand: Command.RefreshTools,
  });
}

export function createDeleteToolCommand() {
  return registerCommand(Command.DeleteTool, handleDeleteTool);
}
