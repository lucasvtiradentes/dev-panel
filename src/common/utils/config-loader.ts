import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { CONFIG_FILE_NAME } from '../constants';
import { getWorkspaceConfigFilePath } from '../lib/config-manager';
import type { PPConfig } from '../schemas';

export function getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] {
  return vscode.workspace.workspaceFolders ?? [];
}

export function loadWorkspaceConfig(folder: vscode.WorkspaceFolder): PPConfig | null {
  const configPath = getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
  if (!fs.existsSync(configPath)) return null;

  return JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
}

export function forEachWorkspaceConfig(callback: (folder: vscode.WorkspaceFolder, config: PPConfig) => void): void {
  const folders = getWorkspaceFolders();
  if (folders.length === 0) return;

  for (const folder of folders) {
    const config = loadWorkspaceConfig(folder);
    if (!config) continue;

    callback(folder, config);
  }
}
