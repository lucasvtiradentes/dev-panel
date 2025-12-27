import { GLOBAL_ITEM_PREFIX, getGlobalToolInstructionsPath } from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import { getFirstWorkspaceFolder } from '../../../common/vscode/workspace-utils';
import type { TreeTool } from '../../../views/tools';

export type GoToToolFileParams = TreeTool;

async function handleGoToToolFile(item: GoToToolFileParams) {
  if (item?.toolName) {
    const isGlobal = item.toolName.startsWith(GLOBAL_ITEM_PREFIX);
    const toolName = isGlobal ? item.toolName.substring(GLOBAL_ITEM_PREFIX.length) : item.toolName;

    let instructionsPath: string;
    if (isGlobal) {
      instructionsPath = getGlobalToolInstructionsPath(toolName);
    } else {
      const workspaceFolder = getFirstWorkspaceFolder();
      if (!workspaceFolder) return;
      instructionsPath = ConfigManager.getWorkspaceToolInstructionsPath(workspaceFolder, toolName);
    }

    const uri = VscodeHelper.createFileUri(instructionsPath);
    await VscodeHelper.openDocument(uri);
  }
}

export function createGoToToolFileCommand(): Disposable {
  return registerCommand(Command.GoToToolFile, handleGoToToolFile);
}
