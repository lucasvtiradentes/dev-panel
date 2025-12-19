import { Command, registerCommand } from '../../common';
import type { TaskTreeDataProvider } from '../../views/tasks';
import type { ToolTreeDataProvider } from '../../views/tools';

export function createRefreshCommand(taskTreeDataProvider: TaskTreeDataProvider) {
  return registerCommand(Command.Refresh, () => taskTreeDataProvider.refresh());
}

export function createRefreshToolsCommand(toolTreeDataProvider: ToolTreeDataProvider) {
  return registerCommand(Command.RefreshTools, () => toolTreeDataProvider.refresh());
}
