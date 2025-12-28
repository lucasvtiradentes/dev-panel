import { ConfigKey, LocationScope, getGlobalToolDir } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { TreeTool } from '../../../views/tools/items';

async function handleDeleteTool(treeTool: TreeTool) {
  if (!treeTool?.toolName) {
    TreeItemUtils.showInvalidItemError('tool');
    return;
  }

  const isGlobal = TreeItemUtils.isGlobalItem(treeTool.toolName);
  const toolName = TreeItemUtils.stripGlobalPrefix(treeTool.toolName);

  if (!(await ConfigManager.confirmDelete('tool', toolName, isGlobal))) return;

  if (isGlobal) {
    const globalConfig = ConfigManager.loadGlobalConfig();
    if (!globalConfig) {
      TreeItemUtils.showConfigNotFoundError(LocationScope.Global);
      return;
    }

    if (!globalConfig.tools?.length) {
      TreeItemUtils.showNoItemsFoundError('tool', LocationScope.Global);
      return;
    }

    const removed = ConfigManager.removeConfigItem(globalConfig, ConfigKey.Tools, toolName);
    if (!removed) {
      TreeItemUtils.showNotFoundError('Tool', toolName, LocationScope.Global);
      return;
    }

    ConfigManager.saveGlobalConfig(globalConfig);

    const globalToolsDir = getGlobalToolDir(toolName);
    FileIOHelper.deleteDirectory(globalToolsDir);

    TreeItemUtils.showDeleteSuccessMessage('tool', toolName, true);
    void executeCommand(Command.RefreshTools);
    return;
  }

  const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    TreeItemUtils.showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  if (!workspaceConfig.tools?.length) {
    TreeItemUtils.showNoItemsFoundError('tool', LocationScope.Workspace);
    return;
  }

  const removed = ConfigManager.removeConfigItem(workspaceConfig, ConfigKey.Tools, toolName);
  if (!removed) {
    TreeItemUtils.showNotFoundError('Tool', toolName, LocationScope.Workspace);
    return;
  }

  ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const workspaceToolsDir = ConfigManager.getWorkspaceToolDir(workspaceFolder, toolName);
  FileIOHelper.deleteDirectory(workspaceToolsDir);

  TreeItemUtils.showDeleteSuccessMessage('tool', toolName, false);
  void executeCommand(Command.RefreshTools);
}

export function createDeleteToolCommand() {
  return registerCommand(Command.DeleteTool, handleDeleteTool);
}
