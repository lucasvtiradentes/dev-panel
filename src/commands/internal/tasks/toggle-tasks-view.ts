import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { TaskTreeDataProvider, TreeTask } from '../../../views/tasks';

export type ToggleTaskFavoriteParams = TreeTask;
export type ToggleTaskHideParams = TreeTask;

export function createToggleTasksViewCommands(taskTreeDataProvider: TaskTreeDataProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.ToggleGroupMode, () => taskTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleGroupModeGrouped, () => taskTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.ToggleFavorite, (item: ToggleTaskFavoriteParams) =>
      taskTreeDataProvider.toggleFavorite(item),
    ),
    registerCommand(Command.ToggleUnfavorite, (item: ToggleTaskFavoriteParams) =>
      taskTreeDataProvider.toggleFavorite(item),
    ),
    registerCommand(Command.ToggleHide, (item: ToggleTaskHideParams) => taskTreeDataProvider.toggleHide(item)),
    registerCommand(Command.ToggleTasksShowHidden, () => taskTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.ToggleTasksShowHiddenActive, () => taskTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.ToggleTasksShowOnlyFavorites, () => taskTreeDataProvider.toggleShowOnlyFavorites()),
    registerCommand(Command.ToggleTasksShowOnlyFavoritesActive, () => taskTreeDataProvider.toggleShowOnlyFavorites()),
  ];
}
