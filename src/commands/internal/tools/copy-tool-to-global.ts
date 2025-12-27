import * as fs from 'node:fs';
import { ConfigKey, LocationScope, getGlobalToolDir } from '../../../common/constants';
import {
  addOrUpdateConfigItem,
  confirmOverwrite,
  ensureDirectoryExists,
  getWorkspaceToolDir,
  loadGlobalConfig,
  loadWorkspaceConfig,
  saveGlobalConfig,
} from '../../../common/lib/config-manager';
import {
  isGlobalItem,
  showAlreadyGlobalMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
} from '../../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TreeTool } from '../../../views/tools/items';

async function handleCopyToolToGlobal(treeTool: TreeTool) {
  if (!treeTool?.toolName) {
    showInvalidItemError('tool');
    return;
  }

  if (isGlobalItem(treeTool.toolName)) {
    showAlreadyGlobalMessage('tool');
    return;
  }

  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  const tool = workspaceConfig.tools?.find((t) => t.name === treeTool.toolName);
  if (!tool) {
    showNotFoundError('Tool', treeTool.toolName, LocationScope.Workspace);
    return;
  }

  const globalConfig = loadGlobalConfig() ?? {};
  const exists = globalConfig.tools?.some((t) => t.name === tool.name);

  if (exists && !(await confirmOverwrite('Tool', tool.name))) return;

  addOrUpdateConfigItem(globalConfig, ConfigKey.Tools, tool);
  saveGlobalConfig(globalConfig);

  const workspaceToolsDir = getWorkspaceToolDir(workspaceFolder, tool.name);
  const globalToolsDir = getGlobalToolDir(tool.name);

  if (fs.existsSync(workspaceToolsDir)) {
    ensureDirectoryExists(require('node:path').dirname(globalToolsDir));
    if (fs.existsSync(globalToolsDir)) {
      fs.rmSync(globalToolsDir, { recursive: true });
    }
    fs.cpSync(workspaceToolsDir, globalToolsDir, { recursive: true });
  }

  showCopySuccessMessage('Tool', tool.name, LocationScope.Global);
  void executeCommand(Command.RefreshTools);
}

export function createCopyToolToGlobalCommand() {
  return registerCommand(Command.CopyToolToGlobal, handleCopyToolToGlobal);
}
