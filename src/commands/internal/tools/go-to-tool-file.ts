import * as vscode from 'vscode';
import { GLOBAL_ITEM_PREFIX, TOOLS_DIR, TOOL_INSTRUCTIONS_FILE, getGlobalConfigDir } from '../../../common/constants';
import { joinConfigPath } from '../../../common/lib/config-manager';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import { getFirstWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { TreeTool } from '../../../views/tools';

export type GoToToolFileParams = TreeTool;

export function createGoToToolFileCommand(): Disposable {
  return registerCommand(Command.GoToToolFile, async (item: GoToToolFileParams) => {
    if (item?.toolName) {
      const isGlobal = item.toolName.startsWith(GLOBAL_ITEM_PREFIX);
      const toolName = isGlobal ? item.toolName.substring(GLOBAL_ITEM_PREFIX.length) : item.toolName;

      let instructionsPath: string;
      if (isGlobal) {
        const globalConfigDir = getGlobalConfigDir();
        instructionsPath = `${globalConfigDir}/${TOOLS_DIR}/${toolName}/${TOOL_INSTRUCTIONS_FILE}`;
      } else {
        const workspaceFolder = getFirstWorkspaceFolder();
        if (!workspaceFolder) return;
        instructionsPath = joinConfigPath(workspaceFolder, TOOLS_DIR, toolName, TOOL_INSTRUCTIONS_FILE);
      }

      const uri = vscode.Uri.file(instructionsPath);
      await VscodeHelper.openDocument(uri);
    }
  });
}
