import { ConfigKey, getGlobalToolDir } from '../../../common/constants';
import { ConfigItemOperations } from '../../../common/core/config-item-operations';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { TreeTool } from '../../../views/tools/items';

async function handleCopyToolToGlobal(treeTool: TreeTool) {
  if (!treeTool?.toolName) {
    TreeItemUtils.showInvalidItemError('tool');
    return;
  }

  if (TreeItemUtils.isGlobalItem(treeTool.toolName)) {
    TreeItemUtils.showAlreadyGlobalMessage('tool');
    return;
  }

  await ConfigItemOperations.copyToGlobal({
    itemName: treeTool.toolName,
    itemType: 'Tool',
    configKey: ConfigKey.Tools,
    findInConfig: (config) => config.tools?.find((t) => t.name === treeTool.toolName),
    existsInConfig: (config, item) => config.tools?.some((t) => t.name === item.name) ?? false,
    onCopySideEffect: (item, workspaceFolder) => {
      const workspaceToolsDir = ConfigManager.getWorkspaceToolDir(workspaceFolder, item.name);
      const globalToolsDir = getGlobalToolDir(item.name);

      if (FileIOHelper.fileExists(workspaceToolsDir)) {
        FileIOHelper.ensureDirectoryExists(NodePathHelper.dirname(globalToolsDir));
        FileIOHelper.deleteDirectory(globalToolsDir);
        FileIOHelper.copyDirectory(workspaceToolsDir, globalToolsDir);
      }
    },
    refreshCommand: Command.RefreshTools,
  });
}

export function createCopyToolToGlobalCommand() {
  return registerCommand(Command.CopyToolToGlobal, handleCopyToolToGlobal);
}
