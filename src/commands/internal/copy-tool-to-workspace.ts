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
import { getWorkspaceConfigDirPath, getWorkspaceConfigFilePath, joinConfigPath } from '../../common/lib/config-manager';
import { Command, executeCommand, registerCommand } from '../../common/lib/vscode-utils';
import type { PPConfig } from '../../common/schemas';
import type { TreeTool } from '../../views/tools/items';

async function handleCopyToolToWorkspace(treeTool: TreeTool): Promise<void> {
  if (!treeTool || !treeTool.toolName) {
    vscode.window.showErrorMessage('Invalid tool selected');
    return;
  }

  if (!treeTool.toolName.startsWith(GLOBAL_ITEM_PREFIX)) {
    vscode.window.showInformationMessage('This tool is already in workspace');
    return;
  }

  const toolName = treeTool.toolName.substring(GLOBAL_ITEM_PREFIX.length);

  let workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  if ((vscode.workspace.workspaceFolders?.length ?? 0) > 1) {
    const folders = vscode.workspace.workspaceFolders?.map((f) => ({ label: f.name, folder: f })) ?? [];
    const selected = await vscode.window.showQuickPick(folders, {
      placeHolder: 'Select workspace to copy tool to',
    });

    if (!selected) return;
    workspaceFolder = selected.folder;
  }

  const globalConfigPath = getGlobalConfigPath();
  if (!fs.existsSync(globalConfigPath)) {
    vscode.window.showErrorMessage('Global config not found');
    return;
  }

  const globalConfig = JSON5.parse(fs.readFileSync(globalConfigPath, 'utf8')) as PPConfig;
  const tool = globalConfig.tools?.find((t) => t.name === toolName);

  if (!tool) {
    vscode.window.showErrorMessage(`Tool "${toolName}" not found in global config`);
    return;
  }

  const workspaceConfigPath = getWorkspaceConfigFilePath(workspaceFolder, CONFIG_FILE_NAME);
  const workspaceConfigDir = getWorkspaceConfigDirPath(workspaceFolder);

  if (!fs.existsSync(workspaceConfigDir)) {
    fs.mkdirSync(workspaceConfigDir, { recursive: true });
  }

  let workspaceConfig: PPConfig = {};
  if (fs.existsSync(workspaceConfigPath)) {
    try {
      workspaceConfig = JSON5.parse(fs.readFileSync(workspaceConfigPath, 'utf8')) as PPConfig;
    } catch (error) {
      vscode.window.showErrorMessage('Failed to read workspace config');
      return;
    }
  }

  if (!workspaceConfig.tools) {
    workspaceConfig.tools = [];
  }

  const existingTool = workspaceConfig.tools.find((t) => t.name === tool.name);
  if (existingTool) {
    const choice = await vscode.window.showWarningMessage(
      `Tool "${tool.name}" already exists in workspace. Overwrite?`,
      'Overwrite',
      'Cancel',
    );

    if (choice !== 'Overwrite') return;

    const index = workspaceConfig.tools.indexOf(existingTool);
    workspaceConfig.tools[index] = tool;
  } else {
    workspaceConfig.tools.push(tool);
  }

  fs.writeFileSync(workspaceConfigPath, JSON.stringify(workspaceConfig, null, 2), 'utf8');

  const globalToolsDir = path.join(getGlobalToolsDir(), tool.name);
  const workspaceToolsDir = joinConfigPath(workspaceFolder, TOOLS_DIR, tool.name);

  if (fs.existsSync(globalToolsDir)) {
    const workspaceToolsParentDir = joinConfigPath(workspaceFolder, TOOLS_DIR);
    if (!fs.existsSync(workspaceToolsParentDir)) {
      fs.mkdirSync(workspaceToolsParentDir, { recursive: true });
    }
    if (fs.existsSync(workspaceToolsDir)) {
      fs.rmSync(workspaceToolsDir, { recursive: true });
    }
    fs.cpSync(globalToolsDir, workspaceToolsDir, { recursive: true });
  }

  vscode.window.showInformationMessage(`✓ Tool "${tool.name}" copied to workspace`);
  void executeCommand(Command.RefreshTools);
}

export function createCopyToolToWorkspaceCommand() {
  return registerCommand(Command.CopyToolToWorkspace, handleCopyToolToWorkspace);
}
