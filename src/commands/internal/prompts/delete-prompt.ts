import { ConfigKey, getGlobalPromptFilePath } from '../../../common/constants';
import { ConfigItemOperations } from '../../../common/core/config-item-operations';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import type { DevPanelPrompt } from '../../../common/schemas';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { TreePrompt } from '../../../views/prompts/items';

async function handleDeletePrompt(treePrompt: TreePrompt) {
  if (!treePrompt?.promptName) {
    TreeItemUtils.showInvalidItemError('prompt');
    return;
  }

  const isGlobal = TreeItemUtils.isGlobalItem(treePrompt.promptName);
  const promptName = TreeItemUtils.stripGlobalPrefix(treePrompt.promptName);

  await ConfigItemOperations.deleteItem<DevPanelPrompt>({
    itemName: promptName,
    itemType: 'prompt',
    configKey: ConfigKey.Prompts,
    isGlobal,
    hasItems: (config) => (config.prompts?.length ?? 0) > 0,
    onDeleteSideEffect: (item, isGlobalItem, workspaceFolder) => {
      if (isGlobalItem) {
        const globalPromptFile = getGlobalPromptFilePath(item.file);
        FileIOHelper.deleteFile(globalPromptFile);
      } else if (workspaceFolder) {
        const workspacePromptFile = ConfigManager.getWorkspacePromptFilePath(workspaceFolder, item.file);
        FileIOHelper.deleteFile(workspacePromptFile);
      }
    },
    refreshCommand: Command.RefreshPrompts,
  });
}

export function createDeletePromptCommand() {
  return registerCommand(Command.DeletePrompt, handleDeletePrompt);
}
