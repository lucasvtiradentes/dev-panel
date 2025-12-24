import * as vscode from 'vscode';
import { GLOBAL_ITEM_PREFIX, TOOLS_DIR, TOOL_INSTRUCTIONS_FILE, getGlobalConfigDir } from '../../common/constants';
import { joinConfigPath } from '../../common/lib/config-manager';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { TreeTool } from '../../views/tools';

export function createGoToToolFileCommand(): vscode.Disposable {
  return registerCommand(Command.GoToToolFile, async (item: TreeTool) => {
    if (item?.toolName) {
      const isGlobal = item.toolName.startsWith(GLOBAL_ITEM_PREFIX);
      const toolName = isGlobal ? item.toolName.substring(GLOBAL_ITEM_PREFIX.length) : item.toolName;

      let instructionsPath: string;
      if (isGlobal) {
        const globalConfigDir = getGlobalConfigDir();
        instructionsPath = `${globalConfigDir}/${TOOLS_DIR}/${toolName}/${TOOL_INSTRUCTIONS_FILE}`;
      } else {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;
        instructionsPath = joinConfigPath(workspaceFolder, TOOLS_DIR, toolName, TOOL_INSTRUCTIONS_FILE);
      }

      const uri = vscode.Uri.file(instructionsPath);
      await vscode.window.showTextDocument(uri);
    }
  });
}
