import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { PromptTreeDataProvider } from '../../views/prompts';

export function createTogglePromptsViewCommands(promptTreeDataProvider: PromptTreeDataProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.TogglePromptsGroupMode, () => promptTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.TogglePromptsGroupModeGrouped, () => promptTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.TogglePromptFavorite, (item) => promptTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.TogglePromptUnfavorite, (item) => promptTreeDataProvider.toggleFavorite(item)),
    registerCommand(Command.TogglePromptHide, (item) => promptTreeDataProvider.toggleHide(item)),
    registerCommand(Command.TogglePromptsShowHidden, () => promptTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.TogglePromptsShowHiddenActive, () => promptTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.TogglePromptsShowOnlyFavorites, () => promptTreeDataProvider.toggleShowOnlyFavorites()),
    registerCommand(Command.TogglePromptsShowOnlyFavoritesActive, () =>
      promptTreeDataProvider.toggleShowOnlyFavorites(),
    ),
    registerCommand(Command.RefreshPrompts, () => promptTreeDataProvider.refresh()),
  ];
}
