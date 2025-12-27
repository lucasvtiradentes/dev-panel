import * as fs from 'node:fs';
import { isAbsolute, join } from 'node:path';
import JSON5 from 'json5';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  PROMPTS_DIR_NAME,
  TOOLS_DIR,
  VARIABLES_FILE_NAME,
  getGlobalConfigDir,
  getGlobalConfigPath,
} from '../constants';
import type { ConfigKey } from '../constants/enums';
import { FILENAME_INVALID_CHARS_PATTERN } from '../constants/regex-constants';
import {
  BRANCHES_DIR_NAME,
  BRANCH_CONTEXT_FILENAME,
  BRANCH_CONTEXT_TEMPLATE_FILENAME,
  ROOT_BRANCH_CONTEXT_FILE_NAME,
  TOOL_INSTRUCTIONS_FILE,
} from '../constants/scripts-constants';
import type { DevPanelConfig } from '../schemas';
import { VscodeConstants } from '../vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';
import type { Uri, WorkspaceFolder } from '../vscode/vscode-types';
import { StoreKey, extensionStore } from './extension-store';

function getConfigDir(workspacePath: string, configDir: string | null): Uri {
  const baseDir = VscodeHelper.createFileUri(workspacePath);

  if (!configDir) {
    return VscodeHelper.joinPath(baseDir, CONFIG_DIR_NAME);
  }

  const customDir = isAbsolute(configDir)
    ? VscodeHelper.createFileUri(configDir)
    : VscodeHelper.joinPath(baseDir, configDir);
  return VscodeHelper.joinPath(customDir, CONFIG_DIR_NAME);
}

export function getConfigPath(workspacePath: string, configDir: string | null, fileName: string): string {
  return VscodeHelper.joinPath(getConfigDir(workspacePath, configDir), fileName).fsPath;
}

export function getConfigDirPath(workspacePath: string, configDir: string | null): string {
  return getConfigDir(workspacePath, configDir).fsPath;
}

export async function hasConfig(workspacePath: string, configDir: string | null, fileName: string): Promise<boolean> {
  const configPath = VscodeHelper.createFileUri(getConfigPath(workspacePath, configDir, fileName));
  try {
    await VscodeHelper.stat(configPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectoryRecursive(source: Uri, target: Uri) {
  await VscodeHelper.createDirectory(target);

  const entries = await VscodeHelper.readDirectory(source);
  for (const [name, type] of entries) {
    const sourceEntry = VscodeHelper.joinPath(source, name);
    const targetEntry = VscodeHelper.joinPath(target, name);

    if (type === VscodeConstants.FileType.Directory) {
      await copyDirectoryRecursive(sourceEntry, targetEntry);
    } else {
      await VscodeHelper.copy(sourceEntry, targetEntry, { overwrite: true });
    }
  }
}

export async function moveConfig(workspacePath: string, fromConfigDir: string | null, toConfigDir: string | null) {
  const sourceDir = getConfigDir(workspacePath, fromConfigDir);
  const targetDir = getConfigDir(workspacePath, toConfigDir);

  await copyDirectoryRecursive(sourceDir, targetDir);
  await VscodeHelper.delete(sourceDir, { recursive: true });
}

export function getConfigDirLabel(configDir: string | null): string {
  return configDir ? `${configDir}/${CONFIG_DIR_NAME}` : CONFIG_DIR_NAME;
}

export function getCurrentConfigDir(): string | null {
  return extensionStore.get(StoreKey.ConfigDir);
}

export function setConfigDir(configDir: string | null) {
  extensionStore.set(StoreKey.ConfigDir, configDir);
}

export function getWorkspaceConfigDirPath(folder: WorkspaceFolder): string {
  const configDir = getCurrentConfigDir();
  return getConfigDirPath(folder.uri.fsPath, configDir);
}

export function getWorkspaceConfigFilePath(folder: WorkspaceFolder, fileName: string): string {
  const configDir = getCurrentConfigDir();
  return getConfigPath(folder.uri.fsPath, configDir, fileName);
}

export function joinConfigPath(folder: WorkspaceFolder, ...segments: string[]): string {
  const configDir = getCurrentConfigDir();
  const basePath = getConfigDirPath(folder.uri.fsPath, configDir);
  return join(basePath, ...segments);
}

export function getWorkspaceToolDir(folder: WorkspaceFolder, toolName: string): string {
  return joinConfigPath(folder, TOOLS_DIR, toolName);
}

export function getWorkspaceToolInstructionsPath(folder: WorkspaceFolder, toolName: string): string {
  return joinConfigPath(folder, TOOLS_DIR, toolName, TOOL_INSTRUCTIONS_FILE);
}

export function getWorkspacePromptsDir(folder: WorkspaceFolder): string {
  return joinConfigPath(folder, PROMPTS_DIR_NAME);
}

export function getWorkspacePromptFilePath(folder: WorkspaceFolder, promptFile: string): string {
  return joinConfigPath(folder, promptFile);
}

export function getWorkspaceVariablesPath(folder: WorkspaceFolder): string {
  return joinConfigPath(folder, VARIABLES_FILE_NAME);
}

export function getRootBranchContextFilePath(workspacePath: string): string {
  return join(workspacePath, ROOT_BRANCH_CONTEXT_FILE_NAME);
}

export function getGitExcludeFilePath(workspacePath: string): string {
  return join(workspacePath, '.git', 'info', 'exclude');
}

export function getConfigDirPathFromWorkspacePath(workspacePath: string): string {
  const configDir = getCurrentConfigDir();
  return getConfigDirPath(workspacePath, configDir);
}

export function configDirExists(workspacePath: string): boolean {
  const configDirPath = getConfigDirPathFromWorkspacePath(workspacePath);
  return fs.existsSync(configDirPath);
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

export function parseConfig(content: string): DevPanelConfig | null {
  try {
    return JSON5.parse(content) as DevPanelConfig;
  } catch {
    return null;
  }
}

export function loadConfigFromPath(configPath: string): DevPanelConfig | null {
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON5.parse(fs.readFileSync(configPath, 'utf8')) as DevPanelConfig;
  } catch {
    return null;
  }
}

export function loadWorkspaceConfigFromPath(workspacePath: string): DevPanelConfig | null {
  const configPath = getConfigFilePathFromWorkspacePath(workspacePath, CONFIG_FILE_NAME);
  return loadConfigFromPath(configPath);
}

export function loadWorkspaceConfig(folder: WorkspaceFolder): DevPanelConfig | null {
  const configPath = getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
  return loadConfigFromPath(configPath);
}

export function forEachWorkspaceConfig(callback: (folder: WorkspaceFolder, config: DevPanelConfig) => void) {
  const folders = VscodeHelper.getWorkspaceFolders();
  if (folders.length === 0) return;

  for (const folder of folders) {
    const config = loadWorkspaceConfig(folder);
    if (!config) continue;

    callback(folder, config);
  }
}

export function loadGlobalConfig(): DevPanelConfig | null {
  const configPath = getGlobalConfigPath();
  return loadConfigFromPath(configPath);
}

type ConfigArrayKey = ConfigKey.Prompts | ConfigKey.Tasks | ConfigKey.Tools;
type ConfigArrayItem =
  | NonNullable<DevPanelConfig['prompts']>[number]
  | NonNullable<DevPanelConfig['tasks']>[number]
  | NonNullable<DevPanelConfig['tools']>[number];

export function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function saveConfigToPath(configPath: string, config: DevPanelConfig) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export function saveGlobalConfig(config: DevPanelConfig) {
  const globalConfigDir = getGlobalConfigDir();
  const globalConfigPath = getGlobalConfigPath();
  ensureDirectoryExists(globalConfigDir);
  saveConfigToPath(globalConfigPath, config);
}

export function saveWorkspaceConfig(folder: WorkspaceFolder, config: DevPanelConfig) {
  const workspaceConfigDir = getWorkspaceConfigDirPath(folder);
  const workspaceConfigPath = getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
  ensureDirectoryExists(workspaceConfigDir);
  saveConfigToPath(workspaceConfigPath, config);
}

export async function confirmOverwrite(itemType: string, itemName: string): Promise<boolean> {
  const choice = await VscodeHelper.showToastMessage(
    ToastKind.Warning,
    `${itemType} "${itemName}" already exists. Overwrite?`,
    'Overwrite',
    'Cancel',
  );
  return choice === 'Overwrite';
}

export async function confirmDelete(itemType: string, itemName: string, isGlobal: boolean): Promise<boolean> {
  const choice = await VscodeHelper.showToastMessage(
    ToastKind.Warning,
    `Are you sure you want to delete ${itemType} "${itemName}"${isGlobal ? ' (global)' : ''}?`,
    { modal: true },
    'Delete',
  );
  return choice === 'Delete';
}

export function addOrUpdateConfigItem(
  config: DevPanelConfig,
  arrayKey: ConfigArrayKey,
  item: ConfigArrayItem,
): boolean {
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

export function removeConfigItem(
  config: DevPanelConfig,
  arrayKey: ConfigArrayKey,
  itemName: string,
): ConfigArrayItem | null {
  const array = config[arrayKey] as ConfigArrayItem[] | undefined;
  if (!array) return null;

  const index = array.findIndex((i) => i.name === itemName);
  if (index === -1) return null;

  const [item] = array.splice(index, 1);
  return item;
}
