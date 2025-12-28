import type { DevPanelConfig } from '../schemas';
import { registerDynamicCommand } from '../vscode/vscode-commands';
import type { ExtensionContext, WorkspaceFolder } from '../vscode/vscode-types';
import { ConfigManager } from './config-manager';
import { syncKeybindings } from './keybindings-sync';

type KeybindingItem = { name: string };

type WorkspaceHandler<T> = (item: T, folder: WorkspaceFolder) => () => void;
type GlobalHandler<T> = (item: T) => () => void;

type RegisterKeybindingsOptions<T extends KeybindingItem> = {
  context: ExtensionContext;
  getItems: (config: DevPanelConfig) => T[] | undefined;
  getCommandId: (name: string) => string;
  createWorkspaceHandler: WorkspaceHandler<T>;
  createGlobalHandler: GlobalHandler<T>;
  shouldSkip?: (item: T) => boolean;
};

export function registerItemKeybindings<T extends KeybindingItem>(opts: RegisterKeybindingsOptions<T>) {
  const { context, getItems, getCommandId, createWorkspaceHandler, createGlobalHandler, shouldSkip } = opts;

  ConfigManager.forEachWorkspaceConfig((folder, config) => {
    const items = getItems(config) ?? [];

    for (const item of items) {
      if (shouldSkip?.(item)) continue;

      const commandId = getCommandId(item.name);
      const handler = createWorkspaceHandler(item, folder);
      const disposable = registerDynamicCommand(commandId, handler);
      context.subscriptions.push(disposable);
    }
  });

  const globalConfig = ConfigManager.loadGlobalConfig();
  if (globalConfig) {
    const globalItems = getItems(globalConfig) ?? [];

    for (const item of globalItems) {
      if (shouldSkip?.(item)) continue;

      const commandId = getCommandId(item.name);
      const handler = createGlobalHandler(item);
      const disposable = registerDynamicCommand(commandId, handler);
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
