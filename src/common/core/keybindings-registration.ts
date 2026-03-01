import type { DevPanelConfig } from '../schemas';
import { registerDynamicCommand } from '../vscode/vscode-commands';
import type { ExtensionContext, WorkspaceFolder } from '../vscode/vscode-types';
import { ConfigManager } from './config-manager';

type KeybindingItem = { name: string };

type WorkspaceHandler<T> = (item: T, folder: WorkspaceFolder) => () => void;

type RegisterKeybindingsOptions<T extends KeybindingItem> = {
  context: ExtensionContext;
  getItems: (config: DevPanelConfig) => T[] | undefined;
  getCommandId: (name: string) => string;
  createWorkspaceHandler: WorkspaceHandler<T>;
  shouldSkip?: (item: T) => boolean;
};

export function registerItemKeybindings<T extends KeybindingItem>(opts: RegisterKeybindingsOptions<T>) {
  const { context, getItems, getCommandId, createWorkspaceHandler, shouldSkip } = opts;
  const registeredCommands = new Set<string>();

  ConfigManager.forEachWorkspaceConfig((folder, config) => {
    const items = getItems(config) ?? [];

    for (const item of items) {
      if (shouldSkip?.(item)) continue;

      const commandId = getCommandId(item.name);
      if (registeredCommands.has(commandId)) continue;

      const handler = createWorkspaceHandler(item, folder);
      const disposable = registerDynamicCommand(commandId, handler);
      context.subscriptions.push(disposable);
      registeredCommands.add(commandId);
    }
  });
}
