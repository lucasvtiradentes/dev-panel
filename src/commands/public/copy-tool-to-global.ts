import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  GLOBAL_ITEM_PREFIX,
  TOOLS_DIR,
  getGlobalConfigDir,
  getGlobalConfigPath,
  getGlobalToolsDir,
} from '../../common/constants';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
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

  const workspaceConfigPath = path.join(workspaceFolder.uri.fsPath, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
  if (!fs.existsSync(workspaceConfigPath)) {
    vscode.window.showErrorMessage('Workspace config not found');
    return;
  }

  const workspaceConfig = JSON5.parse(fs.readFileSync(workspaceConfigPath, 'utf8')) as PPConfig;
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

  let globalConfig: PPConfig = {};
  if (fs.existsSync(globalConfigPath)) {
    try {
      globalConfig = JSON5.parse(fs.readFileSync(globalConfigPath, 'utf8')) as PPConfig;
    } catch (error) {
      vscode.window.showErrorMessage('Failed to read global config');
      return;
    }
  }

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

  const workspaceToolsDir = path.join(workspaceFolder.uri.fsPath, CONFIG_DIR_NAME, TOOLS_DIR, tool.name);
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
  void vscode.commands.executeCommand(Command.RefreshTools);
}

export function createCopyToolToGlobalCommand() {
  return registerCommand(Command.CopyToolToGlobal, handleCopyToolToGlobal);
}
