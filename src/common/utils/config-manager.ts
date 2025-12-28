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
import { StoreKey, extensionStore } from '../core/extension-store';
import type { DevPanelConfig } from '../schemas';
import { VscodeConstants } from '../vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';
import type { Uri, WorkspaceFolder } from '../vscode/vscode-types';
import { readJsoncFile } from './functions/read-jsonc-file';
import { FileIOHelper, NodePathHelper } from './helpers/node-helper';

type ConfigArrayKey = ConfigKey.Prompts | ConfigKey.Tasks | ConfigKey.Tools;
type ConfigArrayItem =
  | NonNullable<DevPanelConfig['prompts']>[number]
  | NonNullable<DevPanelConfig['tasks']>[number]
  | NonNullable<DevPanelConfig['tools']>[number];

export class ConfigManager {
  private static getConfigDir(workspacePath: string, configDir: string | null): Uri {
    const baseDir = VscodeHelper.createFileUri(workspacePath);

    if (!configDir) {
      return VscodeHelper.joinPath(baseDir, CONFIG_DIR_NAME);
    }

    const customDir = NodePathHelper.isAbsolute(configDir)
      ? VscodeHelper.createFileUri(configDir)
      : VscodeHelper.joinPath(baseDir, configDir);
    return VscodeHelper.joinPath(customDir, CONFIG_DIR_NAME);
  }

  private static async copyDirectoryRecursive(source: Uri, target: Uri) {
    await VscodeHelper.createDirectory(target);

    const entries = await VscodeHelper.readDirectory(source);
    for (const [name, type] of entries) {
      const sourceEntry = VscodeHelper.joinPath(source, name);
      const targetEntry = VscodeHelper.joinPath(target, name);

      if (type === VscodeConstants.FileType.Directory) {
        await ConfigManager.copyDirectoryRecursive(sourceEntry, targetEntry);
      } else {
        await VscodeHelper.copy(sourceEntry, targetEntry, { overwrite: true });
      }
    }
  }

  static getConfigPath(workspacePath: string, configDir: string | null, fileName: string): string {
    return VscodeHelper.joinPath(ConfigManager.getConfigDir(workspacePath, configDir), fileName).fsPath;
  }

  static getConfigDirPath(workspacePath: string, configDir: string | null): string {
    return ConfigManager.getConfigDir(workspacePath, configDir).fsPath;
  }

  static async hasConfig(workspacePath: string, configDir: string | null, fileName: string): Promise<boolean> {
    const configPath = VscodeHelper.createFileUri(ConfigManager.getConfigPath(workspacePath, configDir, fileName));
    try {
      await VscodeHelper.stat(configPath);
      return true;
    } catch {
      return false;
    }
  }

  static async moveConfig(workspacePath: string, fromConfigDir: string | null, toConfigDir: string | null) {
    const sourceDir = ConfigManager.getConfigDir(workspacePath, fromConfigDir);
    const targetDir = ConfigManager.getConfigDir(workspacePath, toConfigDir);

    await ConfigManager.copyDirectoryRecursive(sourceDir, targetDir);
    await VscodeHelper.delete(sourceDir, { recursive: true });
  }

  static getConfigDirLabel(configDir: string | null): string {
    return configDir ? `${configDir}/${CONFIG_DIR_NAME}` : CONFIG_DIR_NAME;
  }

  static getCurrentConfigDir(): string | null {
    return extensionStore.get(StoreKey.ConfigDir);
  }

  static setConfigDir(configDir: string | null) {
    extensionStore.set(StoreKey.ConfigDir, configDir);
  }

  static getWorkspaceConfigDirPath(folder: WorkspaceFolder): string {
    const configDir = ConfigManager.getCurrentConfigDir();
    return ConfigManager.getConfigDirPath(folder.uri.fsPath, configDir);
  }

  static getWorkspaceConfigFilePath(folder: WorkspaceFolder, fileName: string): string {
    const configDir = ConfigManager.getCurrentConfigDir();
    return ConfigManager.getConfigPath(folder.uri.fsPath, configDir, fileName);
  }

  static joinConfigPath(folder: WorkspaceFolder, ...segments: string[]): string {
    const configDir = ConfigManager.getCurrentConfigDir();
    const basePath = ConfigManager.getConfigDirPath(folder.uri.fsPath, configDir);
    return NodePathHelper.join(basePath, ...segments);
  }

  static getWorkspaceToolDir(folder: WorkspaceFolder, toolName: string): string {
    return ConfigManager.joinConfigPath(folder, TOOLS_DIR, toolName);
  }

  static getWorkspaceToolInstructionsPath(folder: WorkspaceFolder, toolName: string): string {
    return ConfigManager.joinConfigPath(folder, TOOLS_DIR, toolName, TOOL_INSTRUCTIONS_FILE);
  }

  static getWorkspacePromptsDir(folder: WorkspaceFolder): string {
    return ConfigManager.joinConfigPath(folder, PROMPTS_DIR_NAME);
  }

  static getWorkspacePromptFilePath(folder: WorkspaceFolder, promptFile: string): string {
    return ConfigManager.joinConfigPath(folder, promptFile);
  }

  static getWorkspaceVariablesPath(folder: WorkspaceFolder): string {
    return ConfigManager.joinConfigPath(folder, VARIABLES_FILE_NAME);
  }

  static getRootBranchContextFilePath(workspacePath: string): string {
    return NodePathHelper.join(workspacePath, ROOT_BRANCH_CONTEXT_FILE_NAME);
  }

  static getGitExcludeFilePath(workspacePath: string): string {
    return NodePathHelper.join(workspacePath, '.git', 'info', 'exclude');
  }

  static getConfigDirPathFromWorkspacePath(workspacePath: string): string {
    const configDir = ConfigManager.getCurrentConfigDir();
    return ConfigManager.getConfigDirPath(workspacePath, configDir);
  }

  static configDirExists(workspacePath: string): boolean {
    const configDirPath = ConfigManager.getConfigDirPathFromWorkspacePath(workspacePath);
    return FileIOHelper.fileExists(configDirPath);
  }

  static getConfigFilePathFromWorkspacePath(workspacePath: string, fileName: string): string {
    const configDir = ConfigManager.getCurrentConfigDir();
    return ConfigManager.getConfigPath(workspacePath, configDir, fileName);
  }

  static getConfigDirPattern(): string {
    const configDir = ConfigManager.getCurrentConfigDir();
    if (!configDir) {
      return CONFIG_DIR_NAME;
    }
    return `${configDir}/${CONFIG_DIR_NAME}`;
  }

  static getBranchDirectory(workspace: string, branchName: string): string {
    const sanitized = branchName.replace(FILENAME_INVALID_CHARS_PATTERN, '_');
    const configDirPath = ConfigManager.getConfigDirPathFromWorkspacePath(workspace);
    return NodePathHelper.join(configDirPath, BRANCHES_DIR_NAME, sanitized);
  }

  static getBranchContextFilePath(workspace: string, branchName: string): string {
    return NodePathHelper.join(ConfigManager.getBranchDirectory(workspace, branchName), BRANCH_CONTEXT_FILENAME);
  }

  static getBranchPromptsDirectory(workspace: string, branchName: string): string {
    return NodePathHelper.join(ConfigManager.getBranchDirectory(workspace, branchName), PROMPTS_DIR_NAME);
  }

  static getPromptOutputFilePath(
    workspace: string,
    branchName: string,
    promptName: string,
    timestamped: boolean,
  ): string {
    const promptsDir = ConfigManager.getBranchPromptsDirectory(workspace, branchName);
    const safePromptName = promptName.replace(/[/\\:*?"<>|]/g, '_');

    if (timestamped) {
      const datetime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      return NodePathHelper.join(promptsDir, `${safePromptName}-${datetime}.md`);
    }

    return NodePathHelper.join(promptsDir, `${safePromptName}.md`);
  }

  static getBranchContextTemplatePath(workspace: string): string {
    const configDirPath = ConfigManager.getConfigDirPathFromWorkspacePath(workspace);
    return NodePathHelper.join(configDirPath, BRANCH_CONTEXT_TEMPLATE_FILENAME);
  }

  static parseConfig(content: string): DevPanelConfig | null {
    try {
      return readJsoncFile(content) as DevPanelConfig;
    } catch {
      return null;
    }
  }

  static loadConfigFromPath(configPath: string): DevPanelConfig | null {
    if (!FileIOHelper.fileExists(configPath)) return null;
    try {
      return readJsoncFile(FileIOHelper.readFile(configPath)) as DevPanelConfig;
    } catch {
      return null;
    }
  }

  static loadWorkspaceConfigFromPath(workspacePath: string): DevPanelConfig | null {
    const configPath = ConfigManager.getConfigFilePathFromWorkspacePath(workspacePath, CONFIG_FILE_NAME);
    return ConfigManager.loadConfigFromPath(configPath);
  }

  static loadWorkspaceConfig(folder: WorkspaceFolder): DevPanelConfig | null {
    const configPath = ConfigManager.getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
    return ConfigManager.loadConfigFromPath(configPath);
  }

  static forEachWorkspaceConfig(callback: (folder: WorkspaceFolder, config: DevPanelConfig) => void) {
    const folders = VscodeHelper.getWorkspaceFolders();
    if (folders.length === 0) return;

    for (const folder of folders) {
      const config = ConfigManager.loadWorkspaceConfig(folder);
      if (!config) continue;

      callback(folder, config);
    }
  }

  static loadGlobalConfig(): DevPanelConfig | null {
    const configPath = getGlobalConfigPath();
    return ConfigManager.loadConfigFromPath(configPath);
  }

  static ensureDirectoryExists(dirPath: string) {
    FileIOHelper.ensureDirectoryExists(dirPath);
  }

  static saveConfigToPath(configPath: string, config: DevPanelConfig) {
    FileIOHelper.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  static saveGlobalConfig(config: DevPanelConfig) {
    const globalConfigDir = getGlobalConfigDir();
    const globalConfigPath = getGlobalConfigPath();
    ConfigManager.ensureDirectoryExists(globalConfigDir);
    ConfigManager.saveConfigToPath(globalConfigPath, config);
  }

  static saveWorkspaceConfig(folder: WorkspaceFolder, config: DevPanelConfig) {
    const workspaceConfigDir = ConfigManager.getWorkspaceConfigDirPath(folder);
    const workspaceConfigPath = ConfigManager.getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
    ConfigManager.ensureDirectoryExists(workspaceConfigDir);
    ConfigManager.saveConfigToPath(workspaceConfigPath, config);
  }

  static async confirmOverwrite(itemType: string, itemName: string): Promise<boolean> {
    const choice = await VscodeHelper.showToastMessage(
      ToastKind.Warning,
      `${itemType} "${itemName}" already exists. Overwrite?`,
      'Overwrite',
      'Cancel',
    );
    return choice === 'Overwrite';
  }

  static async confirmDelete(itemType: string, itemName: string, isGlobal: boolean): Promise<boolean> {
    const choice = await VscodeHelper.showToastMessage(
      ToastKind.Warning,
      `Are you sure you want to delete ${itemType} "${itemName}"${isGlobal ? ' (global)' : ''}?`,
      { modal: true },
      'Delete',
    );
    return choice === 'Delete';
  }

  static addOrUpdateConfigItem(config: DevPanelConfig, arrayKey: ConfigArrayKey, item: ConfigArrayItem): boolean {
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

  static removeConfigItem(config: DevPanelConfig, arrayKey: ConfigArrayKey, itemName: string): ConfigArrayItem | null {
    const array = config[arrayKey] as ConfigArrayItem[] | undefined;
    if (!array) return null;

    const index = array.findIndex((i) => i.name === itemName);
    if (index === -1) return null;

    const [item] = array.splice(index, 1);
    return item;
  }

  static readSettings(folder: WorkspaceFolder): DevPanelConfig['settings'] | undefined {
    const config = ConfigManager.loadWorkspaceConfig(folder);
    if (!config) return undefined;
    return config.settings;
  }
}
