import { LocationScope } from '../constants/enums';
import type { DevPanelConfig } from '../schemas';
import { type Command, executeCommand } from '../vscode/vscode-commands';
import { VscodeHelper } from '../vscode/vscode-helper';
import type { WorkspaceFolder } from '../vscode/vscode-types';
import { type ConfigArrayItem, type ConfigArrayKey, ConfigManager } from './config-manager';
import { TreeItemUtils } from './tree-item-utils';

type CopyToGlobalOptions<T extends ConfigArrayItem> = {
  itemName: string;
  itemType: string;
  configKey: ConfigArrayKey;
  findInConfig: (config: DevPanelConfig) => T | undefined;
  existsInConfig: (config: DevPanelConfig, item: T) => boolean;
  onCopySideEffect?: (item: T, workspaceFolder: WorkspaceFolder) => void;
  refreshCommand: Command;
};

type CopyToWorkspaceOptions<T extends ConfigArrayItem> = {
  itemName: string;
  itemType: string;
  configKey: ConfigArrayKey;
  findInConfig: (config: DevPanelConfig) => T | undefined;
  existsInConfig: (config: DevPanelConfig, item: T) => boolean;
  onCopySideEffect?: (item: T, workspaceFolder: WorkspaceFolder) => void;
  refreshCommand: Command;
};

type DeleteItemOptions<T extends ConfigArrayItem> = {
  itemName: string;
  itemType: string;
  configKey: ConfigArrayKey;
  isGlobal: boolean;
  hasItems: (config: DevPanelConfig) => boolean;
  onDeleteSideEffect?: (item: T, isGlobal: boolean, workspaceFolder?: WorkspaceFolder) => void;
  refreshCommand: Command;
};

export class ConfigItemOperations {
  static async copyToGlobal<T extends ConfigArrayItem>(opts: CopyToGlobalOptions<T>) {
    const { itemName, itemType, configKey, findInConfig, existsInConfig, onCopySideEffect, refreshCommand } = opts;

    const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
    if (!workspaceFolder) return;

    const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
    if (!workspaceConfig) {
      TreeItemUtils.showConfigNotFoundError(LocationScope.Workspace);
      return;
    }

    const item = findInConfig(workspaceConfig);
    if (!item) {
      TreeItemUtils.showNotFoundError(itemType, itemName, LocationScope.Workspace);
      return;
    }

    const globalConfig = ConfigManager.loadGlobalConfig() ?? {};
    const exists = existsInConfig(globalConfig, item);

    if (exists && !(await ConfigManager.confirmOverwrite(itemType, item.name))) return;

    ConfigManager.addOrUpdateConfigItem(globalConfig, configKey, item);
    ConfigManager.saveGlobalConfig(globalConfig);

    onCopySideEffect?.(item, workspaceFolder);

    TreeItemUtils.showCopySuccessMessage(itemType, item.name, LocationScope.Global);
    void executeCommand(refreshCommand);
  }

  static async copyToWorkspace<T extends ConfigArrayItem>(opts: CopyToWorkspaceOptions<T>) {
    const { itemName, itemType, configKey, findInConfig, existsInConfig, onCopySideEffect, refreshCommand } = opts;

    const workspaceFolder = await VscodeHelper.selectWorkspaceFolder(`Select workspace to copy ${itemType} to`);
    if (!workspaceFolder) return;

    const globalConfig = ConfigManager.loadGlobalConfig();
    if (!globalConfig) {
      TreeItemUtils.showConfigNotFoundError(LocationScope.Global);
      return;
    }

    const item = findInConfig(globalConfig);
    if (!item) {
      TreeItemUtils.showNotFoundError(itemType, itemName, LocationScope.Global);
      return;
    }

    const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder) ?? {};
    const exists = existsInConfig(workspaceConfig, item);

    if (exists && !(await ConfigManager.confirmOverwrite(itemType, item.name))) return;

    ConfigManager.addOrUpdateConfigItem(workspaceConfig, configKey, item);
    ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

    onCopySideEffect?.(item, workspaceFolder);

    TreeItemUtils.showCopySuccessMessage(itemType, item.name, LocationScope.Workspace);
    void executeCommand(refreshCommand);
  }

  static async deleteItem<T extends ConfigArrayItem>(opts: DeleteItemOptions<T>) {
    const { itemName, itemType, configKey, isGlobal, hasItems, onDeleteSideEffect, refreshCommand } = opts;

    if (!(await ConfigManager.confirmDelete(itemType, itemName, isGlobal))) return;

    if (isGlobal) {
      const globalConfig = ConfigManager.loadGlobalConfig();
      if (!globalConfig) {
        TreeItemUtils.showConfigNotFoundError(LocationScope.Global);
        return;
      }

      if (!hasItems(globalConfig)) {
        TreeItemUtils.showNoItemsFoundError(itemType, LocationScope.Global);
        return;
      }

      const removed = ConfigManager.removeConfigItem(globalConfig, configKey, itemName) as T | null;
      if (!removed) {
        TreeItemUtils.showNotFoundError(itemType, itemName, LocationScope.Global);
        return;
      }

      ConfigManager.saveGlobalConfig(globalConfig);
      onDeleteSideEffect?.(removed, true, undefined);

      TreeItemUtils.showDeleteSuccessMessage(itemType, itemName, true);
      void executeCommand(refreshCommand);
      return;
    }

    const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
    if (!workspaceFolder) return;

    const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
    if (!workspaceConfig) {
      TreeItemUtils.showConfigNotFoundError(LocationScope.Workspace);
      return;
    }

    if (!hasItems(workspaceConfig)) {
      TreeItemUtils.showNoItemsFoundError(itemType, LocationScope.Workspace);
      return;
    }

    const removed = ConfigManager.removeConfigItem(workspaceConfig, configKey, itemName) as T | null;
    if (!removed) {
      TreeItemUtils.showNotFoundError(itemType, itemName, LocationScope.Workspace);
      return;
    }

    ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);
    onDeleteSideEffect?.(removed, false, workspaceFolder);

    TreeItemUtils.showDeleteSuccessMessage(itemType, itemName, false);
    void executeCommand(refreshCommand);
  }
}
