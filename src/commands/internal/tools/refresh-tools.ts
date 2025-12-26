import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { ToolTreeDataProvider } from '../../../views/tools';

export function createRefreshToolsCommand(toolTreeDataProvider: ToolTreeDataProvider) {
  return registerCommand(Command.RefreshTools, () => toolTreeDataProvider.refresh());
}
