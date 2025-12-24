import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_FILE_NAME,
  GLOBAL_ITEM_PREFIX,
  TOOLS_DIR,
  getGlobalConfigPath,
  getGlobalToolsDir,
} from '../../common/constants';
import { getWorkspaceConfigDirPath, getWorkspaceConfigFilePath } from '../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas';
import type { TreeTool } from '../../views/tools/items';

async function handleDeleteTool(treeTool: TreeTool): Promise<void> {
  if (!treeTool || !treeTool.toolName) {
    vscode.window.showErrorMessage('Invalid tool selected');
    return;
  }

  const isGlobal = treeTool.toolName.startsWith(GLOBAL_ITEM_PREFIX);
  const toolName = isGlobal ? treeTool.toolName.substring(GLOBAL_ITEM_PREFIX.length) : treeTool.toolName;

  const choice = await vscode.window.showWarningMessage(
    `Are you sure you want to delete tool "${toolName}"${isGlobal ? ' (global)' : ''}?`,
    { modal: true },
    'Delete',
  );

  if (choice !== 'Delete') return;

  if (isGlobal) {
    const globalConfigPath = getGlobalConfigPath();
    if (!fs.existsSync(globalConfigPath)) {
      vscode.window.showErrorMessage('Global config not found');
      return;
    }

    const globalConfig = JSON5.parse(fs.readFileSync(globalConfigPath, 'utf8')) as PPConfig;
    if (!globalConfig.tools) {
      vscode.window.showErrorMessage('No tools found in global config');
      return;
    }

    const toolIndex = globalConfig.tools.findIndex((t) => t.name === toolName);
    if (toolIndex === -1) {
      vscode.window.showErrorMessage(`Tool "${toolName}" not found in global config`);
      return;
    }

    globalConfig.tools.splice(toolIndex, 1);
    fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2), 'utf8');

    const globalToolsDir = path.join(getGlobalToolsDir(), toolName);
    if (fs.existsSync(globalToolsDir)) {
      fs.rmSync(globalToolsDir, { recursive: true });
    }

    vscode.window.showInformationMessage(`✓ Global tool "${toolName}" deleted`);
    void executeCommand(Command.RefreshTools);
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  const workspaceConfigPath = getWorkspaceConfigFilePath(workspaceFolder, CONFIG_FILE_NAME);
  if (!fs.existsSync(workspaceConfigPath)) {
    vscode.window.showErrorMessage('Workspace config not found');
    return;
  }

  const workspaceConfig = JSON5.parse(fs.readFileSync(workspaceConfigPath, 'utf8')) as PPConfig;
  if (!workspaceConfig.tools) {
    vscode.window.showErrorMessage('No tools found in workspace config');
    return;
  }

  const toolIndex = workspaceConfig.tools.findIndex((t) => t.name === toolName);
  if (toolIndex === -1) {
    vscode.window.showErrorMessage(`Tool "${toolName}" not found in workspace config`);
    return;
  }

  workspaceConfig.tools.splice(toolIndex, 1);
  fs.writeFileSync(workspaceConfigPath, JSON.stringify(workspaceConfig, null, 2), 'utf8');

  const workspaceConfigDirPath = getWorkspaceConfigDirPath(workspaceFolder);
  const workspaceToolsDir = path.join(workspaceConfigDirPath, TOOLS_DIR, toolName);
  if (fs.existsSync(workspaceToolsDir)) {
    fs.rmSync(workspaceToolsDir, { recursive: true });
  }

  vscode.window.showInformationMessage(`✓ Tool "${toolName}" deleted`);
  void executeCommand(Command.RefreshTools);
}

export function createDeleteToolCommand() {
  return registerCommand(Command.DeleteTool, handleDeleteTool);
}
