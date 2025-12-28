import { ConfigKey, LocationScope, getGlobalToolDir } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
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

  const workspaceFolder = await VscodeHelper.selectWorkspaceFolder('Select workspace to copy tool to');
  if (!workspaceFolder) return;

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (!globalConfig) {
    TreeItemUtils.showConfigNotFoundError(LocationScope.Global);
    return;
  }

  const tool = globalConfig.tools?.find((t) => t.name === toolName);
  if (!tool) {
    TreeItemUtils.showNotFoundError('Tool', toolName, LocationScope.Global);
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
    FileIOHelper.ensureDirectoryExists(NodePathHelper.dirname(workspaceToolsDir));
    FileIOHelper.deleteDirectory(workspaceToolsDir);
    FileIOHelper.copyDirectory(globalToolsDir, workspaceToolsDir);
  }

  TreeItemUtils.showCopySuccessMessage('Tool', tool.name, LocationScope.Workspace);
  void executeCommand(Command.RefreshTools);
}

export function createCopyToolToWorkspaceCommand() {
  return registerCommand(Command.CopyToolToWorkspace, handleCopyToolToWorkspace);
}
