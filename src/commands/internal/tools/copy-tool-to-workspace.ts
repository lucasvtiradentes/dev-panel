import { ConfigKey, getGlobalToolDir } from '../../../common/constants';
import { ConfigItemOperations } from '../../../common/core/config-item-operations';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { TreeTool } from '../../../views/tools/items';

async function handleCopyToolToWorkspace(treeTool: TreeTool) {
  if (!treeTool?.toolName) {
    TreeItemUtils.showInvalidItemError('tool');
    return;
  }

  if (!TreeItemUtils.isGlobalItem(treeTool.toolName)) {
    TreeItemUtils.showAlreadyWorkspaceMessage('tool');
    return;
  }

  const toolName = TreeItemUtils.stripGlobalPrefix(treeTool.toolName);

  await ConfigItemOperations.copyToWorkspace({
    itemName: toolName,
    itemType: 'Tool',
    configKey: ConfigKey.Tools,
    findInConfig: (config) => config.tools?.find((t) => t.name === toolName),
    existsInConfig: (config, item) => config.tools?.some((t) => t.name === item.name) ?? false,
    onCopySideEffect: (item, workspaceFolder) => {
      const globalToolsDir = getGlobalToolDir(item.name);
      const workspaceToolsDir = ConfigManager.getWorkspaceToolDir(workspaceFolder, item.name);

      if (FileIOHelper.fileExists(globalToolsDir)) {
        FileIOHelper.ensureDirectoryExists(NodePathHelper.dirname(workspaceToolsDir));
        FileIOHelper.deleteDirectory(workspaceToolsDir);
        FileIOHelper.copyDirectory(globalToolsDir, workspaceToolsDir);
      }
    },
    refreshCommand: Command.RefreshTools,
  });
}

export function createCopyToolToWorkspaceCommand() {
  return registerCommand(Command.CopyToolToWorkspace, handleCopyToolToWorkspace);
}
