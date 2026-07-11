import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, VARIABLES_FILE_NAME } from '../constants';
import type { ConfigKey } from '../constants/enums';
import { type DevPanelConfig, DevPanelConfigSchema } from '../schemas';
import { readJsoncFile } from '../utils/functions/read-jsonc-file';
import { JsonHelper } from '../utils/helpers/json-helper';
import { FileIOHelper, NodePathHelper } from '../utils/helpers/node-helper';
import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';
import type { WorkspaceFolder } from '../vscode/vscode-types';

export type ConfigArrayKey = ConfigKey.Tasks;
export type ConfigArrayItem = NonNullable<DevPanelConfig['tasks']>[number];

export class ConfigManager {
  static getConfigDirPath(workspacePath: string): string {
    return NodePathHelper.join(workspacePath, CONFIG_DIR_NAME);
  }

  static getConfigFilePathFromWorkspacePath(workspacePath: string, fileName: string): string {
    return NodePathHelper.join(ConfigManager.getConfigDirPath(workspacePath), fileName);
  }

  static getWorkspaceConfigDirPath(folder: WorkspaceFolder): string {
    return ConfigManager.getConfigDirPath(folder.uri.fsPath);
  }

  static getWorkspaceConfigFilePath(folder: WorkspaceFolder, fileName: string): string {
    return ConfigManager.getConfigFilePathFromWorkspacePath(folder.uri.fsPath, fileName);
  }

  static joinConfigPath(folder: WorkspaceFolder, ...segments: string[]): string {
    return NodePathHelper.join(ConfigManager.getWorkspaceConfigDirPath(folder), ...segments);
  }

  static getWorkspaceVariablesPath(folder: WorkspaceFolder): string {
    return ConfigManager.joinConfigPath(folder, VARIABLES_FILE_NAME);
  }

  static parseConfig(content: string): DevPanelConfig | null {
    try {
      return DevPanelConfigSchema.parse(readJsoncFile(content));
    } catch {
      return null;
    }
  }

  static loadConfigFromPath(configPath: string): DevPanelConfig | null {
    if (!FileIOHelper.fileExists(configPath)) return null;
    try {
      return DevPanelConfigSchema.parse(readJsoncFile(FileIOHelper.readFile(configPath)));
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
    for (const folder of VscodeHelper.getWorkspaceFolders()) {
      const config = ConfigManager.loadWorkspaceConfig(folder);
      if (!config) continue;
      callback(folder, config);
    }
  }

  static saveConfigToPath(configPath: string, config: DevPanelConfig) {
    FileIOHelper.writeFile(configPath, JsonHelper.stringifyPretty(config));
  }

  static saveWorkspaceConfig(folder: WorkspaceFolder, config: DevPanelConfig) {
    const workspaceConfigDir = ConfigManager.getWorkspaceConfigDirPath(folder);
    const workspaceConfigPath = ConfigManager.getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
    FileIOHelper.ensureDirectoryExists(workspaceConfigDir);
    ConfigManager.saveConfigToPath(workspaceConfigPath, config);
  }

  static async confirmDelete(itemType: string, itemName: string): Promise<boolean> {
    const choiceValue = 'Delete';
    const choice = await VscodeHelper.showToastMessage(
      ToastKind.Warning,
      `Are you sure you want to delete ${itemType} "${itemName}"?`,
      { modal: true },
      choiceValue,
    );
    return choice === choiceValue;
  }

  static removeConfigItem(config: DevPanelConfig, arrayKey: ConfigArrayKey, itemName: string): ConfigArrayItem | null {
    const array = config[arrayKey] as ConfigArrayItem[];
    if (!array) return null;

    const index = array.findIndex((item) => item.name === itemName);
    if (index === -1) return null;

    const [item] = array.splice(index, 1);
    return item;
  }
}
