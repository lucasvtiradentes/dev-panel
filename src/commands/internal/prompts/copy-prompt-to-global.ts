import { ConfigKey, getGlobalPromptFilePath } from '../../../common/constants';
import { ConfigItemOperations } from '../../../common/core/config-item-operations';
import { ConfigManager } from '../../../common/core/config-manager';
import { TreeItemUtils } from '../../../common/core/tree-item-utils';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { TreePrompt } from '../../../views/prompts/items';

async function handleCopyPromptToGlobal(treePrompt: TreePrompt) {
  if (!treePrompt?.promptName) {
    TreeItemUtils.showInvalidItemError('prompt');
    return;
  }

  if (TreeItemUtils.isGlobalItem(treePrompt.promptName)) {
    TreeItemUtils.showAlreadyGlobalMessage('prompt');
    return;
  }

  await ConfigItemOperations.copyToGlobal({
    itemName: treePrompt.promptName,
    itemType: 'Prompt',
    configKey: ConfigKey.Prompts,
    findInConfig: (config) => config.prompts?.find((p) => p.name === treePrompt.promptName),
    existsInConfig: (config, item) => config.prompts?.some((p) => p.name === item.name) ?? false,
    onCopySideEffect: (item, workspaceFolder) => {
      const workspacePromptFile = ConfigManager.getWorkspacePromptFilePath(workspaceFolder, item.file);
      const globalPromptFile = getGlobalPromptFilePath(item.file);

      if (FileIOHelper.fileExists(workspacePromptFile)) {
        FileIOHelper.ensureDirectoryExists(NodePathHelper.dirname(globalPromptFile));
        FileIOHelper.copyFile(workspacePromptFile, globalPromptFile);
      }
    },
    refreshCommand: Command.RefreshPrompts,
  });
}

export function createCopyPromptToGlobalCommand() {
  return registerCommand(Command.CopyPromptToGlobal, handleCopyPromptToGlobal);
}
