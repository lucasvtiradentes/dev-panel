import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { ReplacementsProvider } from '../../../views/replacements';

export function createToggleReplacementsViewCommands(replacementsProvider: ReplacementsProvider): Disposable[] {
  return [
    registerCommand(Command.ToggleReplacementsGroupMode, () => replacementsProvider.toggleGroupMode()),
    registerCommand(Command.ToggleReplacementsGroupModeGrouped, () => replacementsProvider.toggleGroupMode()),
  ];
}
