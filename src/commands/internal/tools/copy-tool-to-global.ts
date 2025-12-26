import * as fs from 'node:fs';
import * as path from 'node:path';
import { TOOLS_DIR, getGlobalToolsDir } from '../../../common/constants';
import {
  addOrUpdateConfigItem,
  confirmOverwrite,
  ensureDirectoryExists,
  joinConfigPath,
  loadGlobalConfig,
  loadWorkspaceConfig,
  saveGlobalConfig,
} from '../../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../../common/lib/vscode-utils';
import {
  isGlobalItem,
  showAlreadyGlobalMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
} from '../../../common/utils/item-utils';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import type { TreeTool } from '../../../views/tools/items';

async function handleCopyToolToGlobal(treeTool: TreeTool): Promise<void> {
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
    showConfigNotFoundError('workspace');
    return;
  }

  const tool = workspaceConfig.tools?.find((t) => t.name === treeTool.toolName);
  if (!tool) {
    showNotFoundError('Tool', treeTool.toolName, 'workspace');
    return;
  }

  const globalConfig = loadGlobalConfig() ?? {};
  const exists = globalConfig.tools?.some((t) => t.name === tool.name);

  if (exists && !(await confirmOverwrite('Tool', tool.name))) return;

  addOrUpdateConfigItem(globalConfig, 'tools', tool);
  saveGlobalConfig(globalConfig);

  const workspaceToolsDir = joinConfigPath(workspaceFolder, TOOLS_DIR, tool.name);
  const globalToolsDir = path.join(getGlobalToolsDir(), tool.name);

  if (fs.existsSync(workspaceToolsDir)) {
    ensureDirectoryExists(getGlobalToolsDir());
    if (fs.existsSync(globalToolsDir)) {
      fs.rmSync(globalToolsDir, { recursive: true });
    }
    fs.cpSync(workspaceToolsDir, globalToolsDir, { recursive: true });
  }

  showCopySuccessMessage('Tool', tool.name, 'global');
  void executeCommand(Command.RefreshTools);
}

export function createCopyToolToGlobalCommand() {
  return registerCommand(Command.CopyToolToGlobal, handleCopyToolToGlobal);
}
