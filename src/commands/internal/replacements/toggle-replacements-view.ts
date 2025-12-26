import type * as vscode from 'vscode';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { ReplacementsProvider } from '../../../views/replacements';

export function createToggleReplacementsViewCommands(replacementsProvider: ReplacementsProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.ToggleReplacementsGroupMode, () => replacementsProvider.toggleGroupMode()),
    registerCommand(Command.ToggleReplacementsGroupModeGrouped, () => replacementsProvider.toggleGroupMode()),
  ];
}
