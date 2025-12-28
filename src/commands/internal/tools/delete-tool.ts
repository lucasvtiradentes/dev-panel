import { ConfigKey, LocationScope, getGlobalToolDir } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
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
import type { TreeTool } from '../../../views/tools/items';

async function handleDeleteTool(treeTool: TreeTool) {
  if (!treeTool?.toolName) {
    showInvalidItemError('tool');
    return;
  }

  const isGlobal = isGlobalItem(treeTool.toolName);
  const toolName = stripGlobalPrefix(treeTool.toolName);

  if (!(await ConfigManager.confirmDelete('tool', toolName, isGlobal))) return;

  if (isGlobal) {
    const globalConfig = ConfigManager.loadGlobalConfig();
    if (!globalConfig) {
      showConfigNotFoundError(LocationScope.Global);
      return;
    }

    if (!globalConfig.tools?.length) {
      showNoItemsFoundError('tool', LocationScope.Global);
      return;
    }

    const removed = ConfigManager.removeConfigItem(globalConfig, ConfigKey.Tools, toolName);
    if (!removed) {
      showNotFoundError('Tool', toolName, LocationScope.Global);
      return;
    }

    ConfigManager.saveGlobalConfig(globalConfig);

    const globalToolsDir = getGlobalToolDir(toolName);
    FileIOHelper.deleteDirectory(globalToolsDir);

    showDeleteSuccessMessage('tool', toolName, true);
    void executeCommand(Command.RefreshTools);
    return;
  }

  const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  if (!workspaceConfig.tools?.length) {
    showNoItemsFoundError('tool', LocationScope.Workspace);
    return;
  }

  const removed = ConfigManager.removeConfigItem(workspaceConfig, ConfigKey.Tools, toolName);
  if (!removed) {
    showNotFoundError('Tool', toolName, LocationScope.Workspace);
    return;
  }

  ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const workspaceToolsDir = ConfigManager.getWorkspaceToolDir(workspaceFolder, toolName);
  FileIOHelper.deleteDirectory(workspaceToolsDir);

  showDeleteSuccessMessage('tool', toolName, false);
  void executeCommand(Command.RefreshTools);
}

export function createDeleteToolCommand() {
  return registerCommand(Command.DeleteTool, handleDeleteTool);
}
