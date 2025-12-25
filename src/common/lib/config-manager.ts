import * as fs from 'node:fs';
import { isAbsolute, join } from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, getGlobalConfigDir, getGlobalConfigPath } from '../constants';
import { FILENAME_INVALID_CHARS_PATTERN } from '../constants/regex-constants';
import {
  BRANCHES_DIR_NAME,
  BRANCH_CONTEXT_FILENAME,
  BRANCH_CONTEXT_TEMPLATE_FILENAME,
  PROMPTS_DIR_NAME,
} from '../constants/scripts-constants';
import type { PPConfig } from '../schemas';
import { StoreKey, extensionStore } from './extension-store';

function getConfigDir(workspacePath: string, configDir: string | null): vscode.Uri {
  const baseDir = vscode.Uri.file(workspacePath);

  if (!configDir) {
    return vscode.Uri.joinPath(baseDir, CONFIG_DIR_NAME);
  }

  const customDir = isAbsolute(configDir) ? vscode.Uri.file(configDir) : vscode.Uri.joinPath(baseDir, configDir);
  return vscode.Uri.joinPath(customDir, CONFIG_DIR_NAME);
}

export function getConfigPath(workspacePath: string, configDir: string | null, fileName: string): string {
  return vscode.Uri.joinPath(getConfigDir(workspacePath, configDir), fileName).fsPath;
}

export function getConfigDirPath(workspacePath: string, configDir: string | null): string {
  return getConfigDir(workspacePath, configDir).fsPath;
}

export async function hasConfig(workspacePath: string, configDir: string | null, fileName: string): Promise<boolean> {
  const configPath = vscode.Uri.file(getConfigPath(workspacePath, configDir, fileName));
  try {
    await vscode.workspace.fs.stat(configPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectoryRecursive(source: vscode.Uri, target: vscode.Uri): Promise<void> {
  await vscode.workspace.fs.createDirectory(target);

  const entries = await vscode.workspace.fs.readDirectory(source);
  for (const [name, type] of entries) {
    const sourceEntry = vscode.Uri.joinPath(source, name);
    const targetEntry = vscode.Uri.joinPath(target, name);

    if (type === vscode.FileType.Directory) {
      await copyDirectoryRecursive(sourceEntry, targetEntry);
    } else {
      await vscode.workspace.fs.copy(sourceEntry, targetEntry, { overwrite: true });
    }
  }
}

export async function moveConfig(
  workspacePath: string,
  fromConfigDir: string | null,
  toConfigDir: string | null,
): Promise<void> {
  const sourceDir = getConfigDir(workspacePath, fromConfigDir);
  const targetDir = getConfigDir(workspacePath, toConfigDir);

  await copyDirectoryRecursive(sourceDir, targetDir);
  await vscode.workspace.fs.delete(sourceDir, { recursive: true });
}

export function getConfigDirLabel(configDir: string | null): string {
  return configDir ? `${configDir}/${CONFIG_DIR_NAME}` : CONFIG_DIR_NAME;
}

export function getCurrentConfigDir(): string | null {
  return extensionStore.get(StoreKey.ConfigDir);
}

export function setConfigDir(configDir: string | null): void {
  extensionStore.set(StoreKey.ConfigDir, configDir);
}

export function getWorkspaceConfigDirPath(folder: vscode.WorkspaceFolder): string {
  const configDir = getCurrentConfigDir();
  return getConfigDirPath(folder.uri.fsPath, configDir);
}

export function getWorkspaceConfigFilePath(folder: vscode.WorkspaceFolder, fileName: string): string {
  const configDir = getCurrentConfigDir();
  return getConfigPath(folder.uri.fsPath, configDir, fileName);
}

export function joinConfigPath(folder: vscode.WorkspaceFolder, ...segments: string[]): string {
  const configDir = getCurrentConfigDir();
  const basePath = getConfigDirPath(folder.uri.fsPath, configDir);
  return join(basePath, ...segments);
}

export function getConfigDirPathFromWorkspacePath(workspacePath: string): string {
  const configDir = getCurrentConfigDir();
  return getConfigDirPath(workspacePath, configDir);
}

export function getConfigFilePathFromWorkspacePath(workspacePath: string, fileName: string): string {
  const configDir = getCurrentConfigDir();
  return getConfigPath(workspacePath, configDir, fileName);
}

export function getConfigDirPattern(): string {
  const configDir = getCurrentConfigDir();
  if (!configDir) {
    return CONFIG_DIR_NAME;
  }
  return `${configDir}/${CONFIG_DIR_NAME}`;
}

export function getBranchDirectory(workspace: string, branchName: string): string {
  const sanitized = branchName.replace(FILENAME_INVALID_CHARS_PATTERN, '_');
  const configDirPath = getConfigDirPathFromWorkspacePath(workspace);
  return join(configDirPath, BRANCHES_DIR_NAME, sanitized);
}

export function getBranchContextFilePath(workspace: string, branchName: string): string {
  return join(getBranchDirectory(workspace, branchName), BRANCH_CONTEXT_FILENAME);
}

export function getBranchContextGlobPattern(): string {
  const configDirPattern = getConfigDirPattern();
  return `${configDirPattern}/${BRANCHES_DIR_NAME}/*/${BRANCH_CONTEXT_FILENAME}`;
}

export function getBranchPromptsDirectory(workspace: string, branchName: string): string {
  return join(getBranchDirectory(workspace, branchName), PROMPTS_DIR_NAME);
}

export function getPromptOutputFilePath(
  workspace: string,
  branchName: string,
  promptName: string,
  timestamped: boolean,
): string {
  const promptsDir = getBranchPromptsDirectory(workspace, branchName);
  const safePromptName = promptName.replace(/[/\\:*?"<>|]/g, '_');

  if (timestamped) {
    const datetime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return join(promptsDir, `${safePromptName}-${datetime}.md`);
  }

  return join(promptsDir, `${safePromptName}.md`);
}

export function getBranchContextTemplatePath(workspace: string): string {
  const configDirPath = getConfigDirPathFromWorkspacePath(workspace);
  return join(configDirPath, BRANCH_CONTEXT_TEMPLATE_FILENAME);
}

export function getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] {
  return vscode.workspace.workspaceFolders ?? [];
}

export function parseConfig(content: string): PPConfig | null {
  try {
    return JSON5.parse(content) as PPConfig;
  } catch {
    return null;
  }
}

export function loadConfigFromPath(configPath: string): PPConfig | null {
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
  } catch {
    return null;
  }
}

export function loadWorkspaceConfigFromPath(workspacePath: string): PPConfig | null {
  const configPath = getConfigFilePathFromWorkspacePath(workspacePath, CONFIG_FILE_NAME);
  return loadConfigFromPath(configPath);
}

export function loadWorkspaceConfig(folder: vscode.WorkspaceFolder): PPConfig | null {
  const configPath = getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
  return loadConfigFromPath(configPath);
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

export function loadGlobalConfig(): PPConfig | null {
  const configPath = getGlobalConfigPath();
  return loadConfigFromPath(configPath);
}

type ConfigArrayKey = 'prompts' | 'tasks' | 'tools';
type ConfigArrayItem =
  | NonNullable<PPConfig['prompts']>[number]
  | NonNullable<PPConfig['tasks']>[number]
  | NonNullable<PPConfig['tools']>[number];

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function saveConfigToPath(configPath: string, config: PPConfig): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export function saveGlobalConfig(config: PPConfig): void {
  const globalConfigDir = getGlobalConfigDir();
  const globalConfigPath = getGlobalConfigPath();
  ensureDirectoryExists(globalConfigDir);
  saveConfigToPath(globalConfigPath, config);
}

export function saveWorkspaceConfig(folder: vscode.WorkspaceFolder, config: PPConfig): void {
  const workspaceConfigDir = getWorkspaceConfigDirPath(folder);
  const workspaceConfigPath = getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
  ensureDirectoryExists(workspaceConfigDir);
  saveConfigToPath(workspaceConfigPath, config);
}

export async function confirmOverwrite(itemType: string, itemName: string): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    `${itemType} "${itemName}" already exists. Overwrite?`,
    'Overwrite',
    'Cancel',
  );
  return choice === 'Overwrite';
}

export async function confirmDelete(itemType: string, itemName: string, isGlobal: boolean): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    `Are you sure you want to delete ${itemType} "${itemName}"${isGlobal ? ' (global)' : ''}?`,
    { modal: true },
    'Delete',
  );
  return choice === 'Delete';
}

export function addOrUpdateConfigItem(config: PPConfig, arrayKey: ConfigArrayKey, item: ConfigArrayItem): boolean {
  if (!config[arrayKey]) {
    if (arrayKey === 'prompts') config.prompts = [];
    else if (arrayKey === 'tasks') config.tasks = [];
    else if (arrayKey === 'tools') config.tools = [];
  }

  const array = config[arrayKey] as ConfigArrayItem[];
  const existingIndex = array.findIndex((i) => i.name === item.name);

  if (existingIndex !== -1) {
    array[existingIndex] = item;
    return true;
  }

  array.push(item);
  return false;
}

export function removeConfigItem(config: PPConfig, arrayKey: ConfigArrayKey, itemName: string): ConfigArrayItem | null {
  const array = config[arrayKey] as ConfigArrayItem[] | undefined;
  if (!array) return null;

  const index = array.findIndex((i) => i.name === itemName);
  if (index === -1) return null;

  const [item] = array.splice(index, 1);
  return item;
}
