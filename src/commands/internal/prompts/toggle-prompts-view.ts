import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { PromptTreeDataProvider, TreePrompt } from '../../../views/prompts';

export type TogglePromptFavoriteParams = TreePrompt;
export type TogglePromptHideParams = TreePrompt;

export function createTogglePromptsViewCommands(promptTreeDataProvider: PromptTreeDataProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.TogglePromptsGroupMode, () => promptTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.TogglePromptsGroupModeGrouped, () => promptTreeDataProvider.toggleGroupMode()),
    registerCommand(Command.TogglePromptFavorite, (item: TogglePromptFavoriteParams) =>
      promptTreeDataProvider.toggleFavorite(item),
    ),
    registerCommand(Command.TogglePromptUnfavorite, (item: TogglePromptFavoriteParams) =>
      promptTreeDataProvider.toggleFavorite(item),
    ),
    registerCommand(Command.TogglePromptHide, (item: TogglePromptHideParams) =>
      promptTreeDataProvider.toggleHide(item),
    ),
    registerCommand(Command.TogglePromptsShowHidden, () => promptTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.TogglePromptsShowHiddenActive, () => promptTreeDataProvider.toggleShowHidden()),
    registerCommand(Command.TogglePromptsShowOnlyFavorites, () => promptTreeDataProvider.toggleShowOnlyFavorites()),
    registerCommand(Command.TogglePromptsShowOnlyFavoritesActive, () =>
      promptTreeDataProvider.toggleShowOnlyFavorites(),
    ),
  ];
}
