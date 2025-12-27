import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { ToolTreeDataProvider } from '../../../views/tools';

export function createRefreshToolsCommand(toolTreeDataProvider: ToolTreeDataProvider) {
  return registerCommand(Command.RefreshTools, () => toolTreeDataProvider.refresh());
}
