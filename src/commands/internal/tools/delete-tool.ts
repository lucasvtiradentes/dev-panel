import * as fs from 'node:fs';
import { ConfigKey, LocationScope, getGlobalToolDir } from '../../../common/constants';
import {
  confirmDelete,
  getWorkspaceToolDir,
  loadGlobalConfig,
  loadWorkspaceConfig,
  removeConfigItem,
  saveGlobalConfig,
  saveWorkspaceConfig,
} from '../../../common/lib/config-manager';
import {
  isGlobalItem,
  showConfigNotFoundError,
  showDeleteSuccessMessage,
  showInvalidItemError,
  showNoItemsFoundError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TreeTool } from '../../../views/tools/items';

async function handleDeleteTool(treeTool: TreeTool) {
  if (!treeTool?.toolName) {
    showInvalidItemError('tool');
    return;
  }

  const isGlobal = isGlobalItem(treeTool.toolName);
  const toolName = stripGlobalPrefix(treeTool.toolName);

  if (!(await confirmDelete('tool', toolName, isGlobal))) return;

  if (isGlobal) {
    const globalConfig = loadGlobalConfig();
    if (!globalConfig) {
      showConfigNotFoundError(LocationScope.Global);
      return;
    }

    if (!globalConfig.tools?.length) {
      showNoItemsFoundError('tool', LocationScope.Global);
      return;
    }

    const removed = removeConfigItem(globalConfig, ConfigKey.Tools, toolName);
    if (!removed) {
      showNotFoundError('Tool', toolName, LocationScope.Global);
      return;
    }

    saveGlobalConfig(globalConfig);

    const globalToolsDir = getGlobalToolDir(toolName);
    if (fs.existsSync(globalToolsDir)) {
      fs.rmSync(globalToolsDir, { recursive: true });
    }

    showDeleteSuccessMessage('tool', toolName, true);
    void executeCommand(Command.RefreshTools);
    return;
  }

  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  if (!workspaceConfig.tools?.length) {
    showNoItemsFoundError('tool', LocationScope.Workspace);
    return;
  }

  const removed = removeConfigItem(workspaceConfig, ConfigKey.Tools, toolName);
  if (!removed) {
    showNotFoundError('Tool', toolName, LocationScope.Workspace);
    return;
  }

  saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const workspaceToolsDir = getWorkspaceToolDir(workspaceFolder, toolName);
  if (fs.existsSync(workspaceToolsDir)) {
    fs.rmSync(workspaceToolsDir, { recursive: true });
  }

  showDeleteSuccessMessage('tool', toolName, false);
  void executeCommand(Command.RefreshTools);
}

export function createDeleteToolCommand() {
  return registerCommand(Command.DeleteTool, handleDeleteTool);
}
