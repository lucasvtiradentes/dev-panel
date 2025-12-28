import { ConfigKey, LocationScope, getGlobalToolDir } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import {
  isGlobalItem,
  showAlreadyGlobalMessage,
  showConfigNotFoundError,
  showCopySuccessMessage,
  showInvalidItemError,
  showNotFoundError,
} from '../../../common/utils/item-utils';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
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

  const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    showConfigNotFoundError(LocationScope.Workspace);
    return;
  }

  const tool = workspaceConfig.tools?.find((t) => t.name === treeTool.toolName);
  if (!tool) {
    showNotFoundError('Tool', treeTool.toolName, LocationScope.Workspace);
    return;
  }

  const globalConfig = ConfigManager.loadGlobalConfig() ?? {};
  const exists = globalConfig.tools?.some((t) => t.name === tool.name);

  if (exists && !(await ConfigManager.confirmOverwrite('Tool', tool.name))) return;

  ConfigManager.addOrUpdateConfigItem(globalConfig, ConfigKey.Tools, tool);
  ConfigManager.saveGlobalConfig(globalConfig);

  const workspaceToolsDir = ConfigManager.getWorkspaceToolDir(workspaceFolder, tool.name);
  const globalToolsDir = getGlobalToolDir(tool.name);

  if (FileIOHelper.fileExists(workspaceToolsDir)) {
    FileIOHelper.ensureDirectoryExists(NodePathHelper.dirname(globalToolsDir));
    FileIOHelper.deleteDirectory(globalToolsDir);
    FileIOHelper.copyDirectory(workspaceToolsDir, globalToolsDir);
  }

  showCopySuccessMessage('Tool', tool.name, LocationScope.Global);
  void executeCommand(Command.RefreshTools);
}

export function createCopyToolToGlobalCommand() {
  return registerCommand(Command.CopyToolToGlobal, handleCopyToolToGlobal);
}
