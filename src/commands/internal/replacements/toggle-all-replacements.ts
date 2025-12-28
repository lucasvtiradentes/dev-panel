import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { toggleAllReplacements } from '../../../views/replacements';

export function createToggleAllReplacementsActivateCommand() {
  return registerCommand(Command.ToggleAllReplacementsActivate, toggleAllReplacements);
}

export function createToggleAllReplacementsDeactivateCommand() {
  return registerCommand(Command.ToggleAllReplacementsDeactivate, toggleAllReplacements);
}
