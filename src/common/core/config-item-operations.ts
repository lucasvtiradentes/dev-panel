import { LocationScope } from '../constants/enums';
import type { DevPanelConfig } from '../schemas';
import { type Command, executeCommand } from '../vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';
import type { WorkspaceFolder } from '../vscode/vscode-types';
import { type ConfigArrayItem, type ConfigArrayKey, ConfigManager } from './config-manager';

class ItemOperationsHelper {
  static showConfigNotFoundError(location: LocationScope) {
    VscodeHelper.showToastMessage(
      ToastKind.Error,
      `${location.charAt(0).toUpperCase() + location.slice(1)} config not found`,
    );
  }

  static showNotFoundError(itemType: string, itemName: string, location: LocationScope) {
    VscodeHelper.showToastMessage(ToastKind.Error, `${itemType} "${itemName}" not found in ${location} config`);
  }

  static showNoItemsFoundError(itemType: string, location: LocationScope) {
    VscodeHelper.showToastMessage(ToastKind.Error, `No ${itemType}s found in ${location} config`);
  }

  static showCopySuccessMessage(itemType: string, itemName: string, destination: LocationScope) {
    VscodeHelper.showToastMessage(ToastKind.Info, `✓ ${itemType} "${itemName}" copied to ${destination}`);
  }

  static showDeleteSuccessMessage(itemType: string, itemName: string, isGlobal: boolean) {
    const prefix = isGlobal ? 'Global ' : '';
    VscodeHelper.showToastMessage(ToastKind.Info, `✓ ${prefix}${itemType} "${itemName}" deleted`);
  }
}

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
      ItemOperationsHelper.showConfigNotFoundError(LocationScope.Workspace);
      return;
    }

    const item = findInConfig(workspaceConfig);
    if (!item) {
      ItemOperationsHelper.showNotFoundError(itemType, itemName, LocationScope.Workspace);
      return;
    }

    const globalConfig = ConfigManager.loadGlobalConfig() ?? {};
    const exists = existsInConfig(globalConfig, item);

    if (exists && !(await ConfigManager.confirmOverwrite(itemType, item.name))) return;

    ConfigManager.addOrUpdateConfigItem(globalConfig, configKey, item);
    ConfigManager.saveGlobalConfig(globalConfig);

    onCopySideEffect?.(item, workspaceFolder);

    ItemOperationsHelper.showCopySuccessMessage(itemType, item.name, LocationScope.Global);
    void executeCommand(refreshCommand);
  }

  static async copyToWorkspace<T extends ConfigArrayItem>(opts: CopyToWorkspaceOptions<T>) {
    const { itemName, itemType, configKey, findInConfig, existsInConfig, onCopySideEffect, refreshCommand } = opts;

    const workspaceFolder = await VscodeHelper.selectWorkspaceFolder(`Select workspace to copy ${itemType} to`);
    if (!workspaceFolder) return;

    const globalConfig = ConfigManager.loadGlobalConfig();
    if (!globalConfig) {
      ItemOperationsHelper.showConfigNotFoundError(LocationScope.Global);
      return;
    }

    const item = findInConfig(globalConfig);
    if (!item) {
      ItemOperationsHelper.showNotFoundError(itemType, itemName, LocationScope.Global);
      return;
    }

    const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder) ?? {};
    const exists = existsInConfig(workspaceConfig, item);

    if (exists && !(await ConfigManager.confirmOverwrite(itemType, item.name))) return;

    ConfigManager.addOrUpdateConfigItem(workspaceConfig, configKey, item);
    ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);

    onCopySideEffect?.(item, workspaceFolder);

    ItemOperationsHelper.showCopySuccessMessage(itemType, item.name, LocationScope.Workspace);
    void executeCommand(refreshCommand);
  }

  static async deleteItem<T extends ConfigArrayItem>(opts: DeleteItemOptions<T>) {
    const { itemName, itemType, configKey, isGlobal, hasItems, onDeleteSideEffect, refreshCommand } = opts;

    if (!(await ConfigManager.confirmDelete(itemType, itemName, isGlobal))) return;

    if (isGlobal) {
      const globalConfig = ConfigManager.loadGlobalConfig();
      if (!globalConfig) {
        ItemOperationsHelper.showConfigNotFoundError(LocationScope.Global);
        return;
      }

      if (!hasItems(globalConfig)) {
        ItemOperationsHelper.showNoItemsFoundError(itemType, LocationScope.Global);
        return;
      }

      const removed = ConfigManager.removeConfigItem(globalConfig, configKey, itemName) as T | null;
      if (!removed) {
        ItemOperationsHelper.showNotFoundError(itemType, itemName, LocationScope.Global);
        return;
      }

      ConfigManager.saveGlobalConfig(globalConfig);
      onDeleteSideEffect?.(removed, true, undefined);

      ItemOperationsHelper.showDeleteSuccessMessage(itemType, itemName, true);
      void executeCommand(refreshCommand);
      return;
    }

    const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
    if (!workspaceFolder) return;

    const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
    if (!workspaceConfig) {
      ItemOperationsHelper.showConfigNotFoundError(LocationScope.Workspace);
      return;
    }

    if (!hasItems(workspaceConfig)) {
      ItemOperationsHelper.showNoItemsFoundError(itemType, LocationScope.Workspace);
      return;
    }

    const removed = ConfigManager.removeConfigItem(workspaceConfig, configKey, itemName) as T | null;
    if (!removed) {
      ItemOperationsHelper.showNotFoundError(itemType, itemName, LocationScope.Workspace);
      return;
    }

    ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);
    onDeleteSideEffect?.(removed, false, workspaceFolder);

    ItemOperationsHelper.showDeleteSuccessMessage(itemType, itemName, false);
    void executeCommand(refreshCommand);
  }
}
