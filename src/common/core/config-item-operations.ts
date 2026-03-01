import type { DevPanelConfig } from '../schemas';
import { type Command, executeCommand } from '../vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';
import type { WorkspaceFolder } from '../vscode/vscode-types';
import { type ConfigArrayItem, type ConfigArrayKey, ConfigManager } from './config-manager';

type DeleteItemOptions<T extends ConfigArrayItem> = {
  itemName: string;
  itemType: string;
  configKey: ConfigArrayKey;
  hasItems: (config: DevPanelConfig) => boolean;
  onDeleteSideEffect?: (item: T, workspaceFolder: WorkspaceFolder) => void;
  refreshCommand: Command;
};

export class ConfigItemOperations {
  static async deleteItem<T extends ConfigArrayItem>(opts: DeleteItemOptions<T>) {
    const { itemName, itemType, configKey, hasItems, onDeleteSideEffect, refreshCommand } = opts;

    if (!(await ConfigManager.confirmDelete(itemType, itemName))) return;

    const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
    if (!workspaceFolder) return;

    const workspaceConfig = ConfigManager.loadWorkspaceConfig(workspaceFolder);
    if (!workspaceConfig) {
      VscodeHelper.showToastMessage(ToastKind.Error, 'Workspace config not found');
      return;
    }

    if (!hasItems(workspaceConfig)) {
      VscodeHelper.showToastMessage(ToastKind.Error, `No ${itemType}s found in workspace config`);
      return;
    }

    const removed = ConfigManager.removeConfigItem(workspaceConfig, configKey, itemName) as T | null;
    if (!removed) {
      VscodeHelper.showToastMessage(ToastKind.Error, `${itemType} "${itemName}" not found in workspace config`);
      return;
    }

    ConfigManager.saveWorkspaceConfig(workspaceFolder, workspaceConfig);
    onDeleteSideEffect?.(removed, workspaceFolder);

    VscodeHelper.showToastMessage(ToastKind.Info, `✓ ${itemType} "${itemName}" deleted`);
    void executeCommand(refreshCommand);
  }
}
