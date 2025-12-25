import * as fs from 'node:fs';
import * as path from 'node:path';
import { TOOLS_DIR, getGlobalToolsDir } from '../../common/constants';
import {
  confirmDelete,
  getWorkspaceConfigDirPath,
  loadGlobalConfig,
  loadWorkspaceConfig,
  removeConfigItem,
  saveGlobalConfig,
  saveWorkspaceConfig,
} from '../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../common/lib/vscode-utils';
import {
  isGlobalItem,
  showConfigNotFoundError,
  showDeleteSuccessMessage,
  showInvalidItemError,
  showNoItemsFoundError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../common/utils/workspace-utils';
import type { TreeTool } from '../../views/tools/items';

async function handleDeleteTool(treeTool: TreeTool): Promise<void> {
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
      showConfigNotFoundError('global');
      return;
    }

    if (!globalConfig.tools?.length) {
      showNoItemsFoundError('tool', 'global');
      return;
    }

    const removed = removeConfigItem(globalConfig, 'tools', toolName);
    if (!removed) {
      showNotFoundError('Tool', toolName, 'global');
      return;
    }

    saveGlobalConfig(globalConfig);

    const globalToolsDir = path.join(getGlobalToolsDir(), toolName);
    if (fs.existsSync(globalToolsDir)) {
      fs.rmSync(globalToolsDir, { recursive: true });
    }

    showDeleteSuccessMessage('tool', toolName, true);
  } else {
    const workspaceFolder = requireWorkspaceFolder();
    if (!workspaceFolder) return;

    const workspaceConfig = loadWorkspaceConfig(workspaceFolder);
    if (!workspaceConfig) {
      showConfigNotFoundError('workspace');
      return;
    }

    if (!workspaceConfig.tools?.length) {
      showNoItemsFoundError('tool', 'workspace');
      return;
    }

    const removed = removeConfigItem(workspaceConfig, 'tools', toolName);
    if (!removed) {
      showNotFoundError('Tool', toolName, 'workspace');
      return;
    }

    saveWorkspaceConfig(workspaceFolder, workspaceConfig);

    const workspaceConfigDirPath = getWorkspaceConfigDirPath(workspaceFolder);
    const workspaceToolsDir = path.join(workspaceConfigDirPath, TOOLS_DIR, toolName);
    if (fs.existsSync(workspaceToolsDir)) {
      fs.rmSync(workspaceToolsDir, { recursive: true });
    }

    showDeleteSuccessMessage('tool', toolName, false);
  }

  void executeCommand(Command.RefreshTools);
}

export function createDeleteToolCommand() {
  return registerCommand(Command.DeleteTool, handleDeleteTool);
}
