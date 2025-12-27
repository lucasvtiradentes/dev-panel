import { ConfigKey, LocationScope, getGlobalToolDir } from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import { FileIOHelper } from '../../../common/lib/node-helper';
import {
  isGlobalItem,
  showAlreadyWorkspaceMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
  stripGlobalPrefix,
} from '../../../common/utils/item-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-utils';
import { selectWorkspaceFolder } from '../../../common/vscode/workspace-utils';
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

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (!globalConfig) {
    showConfigNotFoundError(LocationScope.Global);
    return;
  }

  const tool = globalConfig.tools?.find((t) => t.name === toolName);
  if (!tool) {
    showNotFoundError('Tool', toolName, LocationScope.Global);
    return;
  }

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder) ?? {};
  const exists = workspaceConfig.tools?.some((t) => t.name === tool.name);

  if (exists && !(await ConfigManager.confirmOverwrite('Tool', tool.name))) return;

  ConfigManager.addOrUpdateConfigItem(workspaceConfig, ConfigKey.Tools, tool);
  ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

  const globalToolsDir = getGlobalToolDir(tool.name);
  const workspaceToolsDir = ConfigManager.getWorkspaceToolDir(workspaceFolder, tool.name);

  if (FileIOHelper.fileExists(globalToolsDir)) {
    FileIOHelper.ensureDirectoryExists(require('node:path').dirname(workspaceToolsDir));
    FileIOHelper.deleteDirectory(workspaceToolsDir);
    FileIOHelper.copyDirectory(globalToolsDir, workspaceToolsDir);
  }

  showCopySuccessMessage('Tool', tool.name, LocationScope.Workspace);
  void executeCommand(Command.RefreshTools);
}

export function createCopyToolToWorkspaceCommand() {
  return registerCommand(Command.CopyToolToWorkspace, handleCopyToolToWorkspace);
}
