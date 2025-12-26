import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { ReplacementsProvider } from '../../../views/replacements';

export function createToggleReplacementsViewCommands(replacementsProvider: ReplacementsProvider): Disposable[] {
  return [
    registerCommand(Command.ToggleReplacementsGroupMode, () => replacementsProvider.toggleGroupMode()),
    registerCommand(Command.ToggleReplacementsGroupModeGrouped, () => replacementsProvider.toggleGroupMode()),
  ];
}
