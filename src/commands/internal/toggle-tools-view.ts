import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import { type ToolTreeDataProvider, type TreeTool, toggleTool } from '../../views/tools';

export function createToggleToolsViewCommands(toolTreeDataProvider: ToolTreeDataProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.ToggleToolsGroupMode, () => toolTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleToolsGroupModeGrouped, () => toolTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleToolFavorite, (item) => toolTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.ToggleToolUnfavorite, (item) => toolTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.ToggleToolHide, (item) => toolTreeDataProvider.toggleHide(item)),
    registerCommand(Command.ToggleToolsShowHidden, () => toolTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.ToggleToolsShowHiddenActive, () => toolTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.ToggleToolsShowOnlyFavorites, () => toolTreeDataProvider.toggleShowOnlyFavorites()),
    registerCommand(Command.ToggleToolsShowOnlyFavoritesActive, () => toolTreeDataProvider.toggleShowOnlyFavorites()),
    registerCommand(Command.ToggleTool, (item: TreeTool) => toggleTool(item)),
    registerCommand(Command.RefreshTools, () => toolTreeDataProvider.refresh()),
  ];
}
