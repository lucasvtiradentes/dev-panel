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
  saveWorkspaceConfig,
} from '../../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../../common/lib/vscode-utils';
import {
  isGlobalItem,
  showAlreadyWorkspaceMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { selectWorkspaceFolder } from '../../../common/utils/workspace-utils';
import type { TreeTool } from '../../../views/tools/items';

async function handleCopyToolToWorkspace(treeTool: TreeTool) {
  if (!treeTool?.toolName) {
    showInvalidItemError('tool');
    return;
  }

  if (!isGlobalItem(treeTool.toolName)) {
    showAlreadyWorkspaceMessage('tool');
    return;
  }

  const toolName = stripGlobalPrefix(treeTool.toolName);

  const workspaceFolder = await selectWorkspaceFolder('Select workspace to copy tool to');
  if (!workspaceFolder) return;

  const globalConfig = loadGlobalConfig();
  if (!globalConfig) {
    showConfigNotFoundError('global');
    return;
  }

  const tool = globalConfig.tools?.find((t) => t.name === toolName);
  if (!tool) {
    showNotFoundError('Tool', toolName, 'global');
    return;
  }

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder) ?? {};
  const exists = workspaceConfig.tools?.some((t) => t.name === tool.name);

  if (exists && !(await confirmOverwrite('Tool', tool.name))) return;

  addOrUpdateConfigItem(workspaceConfig, 'tools', tool);
  saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const globalToolsDir = path.join(getGlobalToolsDir(), tool.name);
  const workspaceToolsDir = joinConfigPath(workspaceFolder, TOOLS_DIR, tool.name);

  if (fs.existsSync(globalToolsDir)) {
    ensureDirectoryExists(joinConfigPath(workspaceFolder, TOOLS_DIR));
    if (fs.existsSync(workspaceToolsDir)) {
      fs.rmSync(workspaceToolsDir, { recursive: true });
    }
    fs.cpSync(globalToolsDir, workspaceToolsDir, { recursive: true });
  }

  showCopySuccessMessage('Tool', tool.name, 'workspace');
  void executeCommand(Command.RefreshTools);
}

export function createCopyToolToWorkspaceCommand() {
  return registerCommand(Command.CopyToolToWorkspace, handleCopyToolToWorkspace);
}
