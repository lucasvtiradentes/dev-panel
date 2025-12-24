import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  GLOBAL_ITEM_PREFIX,
  TOOLS_DIR,
  getGlobalConfigDir,
  getGlobalConfigPath,
  getGlobalToolsDir,
} from '../../common/constants';
import { joinConfigPath, loadGlobalConfig, loadWorkspaceConfig } from '../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas';
import type { TreeTool } from '../../views/tools/items';

async function handleCopyToolToGlobal(treeTool: TreeTool): Promise<void> {
  if (!treeTool || !treeTool.toolName) {
    vscode.window.showErrorMessage('Invalid tool selected');
    return;
  }

  if (treeTool.toolName.startsWith(GLOBAL_ITEM_PREFIX)) {
    vscode.window.showInformationMessage('This tool is already global');
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  const workspaceConfig = loadWorkspaceConfig(workspaceFolder);
  if (!workspaceConfig) {
    vscode.window.showErrorMessage('Workspace config not found');
    return;
  }

  const tool = workspaceConfig.tools?.find((t) => t.name === treeTool.toolName);

  if (!tool) {
    vscode.window.showErrorMessage(`Tool "${treeTool.toolName}" not found in workspace config`);
    return;
  }

  const globalConfigDir = getGlobalConfigDir();
  const globalConfigPath = getGlobalConfigPath();

  if (!fs.existsSync(globalConfigDir)) {
    fs.mkdirSync(globalConfigDir, { recursive: true });
  }

  const globalConfig: PPConfig = loadGlobalConfig() ?? {};

  if (!globalConfig.tools) {
    globalConfig.tools = [];
  }

  const existingTool = globalConfig.tools.find((t) => t.name === tool.name);
  if (existingTool) {
    const choice = await vscode.window.showWarningMessage(
      `Tool "${tool.name}" already exists in global config. Overwrite?`,
      'Overwrite',
      'Cancel',
    );

    if (choice !== 'Overwrite') return;

    const index = globalConfig.tools.indexOf(existingTool);
    globalConfig.tools[index] = tool;
  } else {
    globalConfig.tools.push(tool);
  }

  fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2), 'utf8');

  const workspaceToolsDir = joinConfigPath(workspaceFolder, TOOLS_DIR, tool.name);
  const globalToolsDir = path.join(getGlobalToolsDir(), tool.name);

  if (fs.existsSync(workspaceToolsDir)) {
    if (!fs.existsSync(getGlobalToolsDir())) {
      fs.mkdirSync(getGlobalToolsDir(), { recursive: true });
    }
    if (fs.existsSync(globalToolsDir)) {
      fs.rmSync(globalToolsDir, { recursive: true });
    }
    fs.cpSync(workspaceToolsDir, globalToolsDir, { recursive: true });
  }

  vscode.window.showInformationMessage(`✓ Tool "${tool.name}" copied to global config`);
  void executeCommand(Command.RefreshTools);
}

export function createCopyToolToGlobalCommand() {
  return registerCommand(Command.CopyToolToGlobal, handleCopyToolToGlobal);
}
