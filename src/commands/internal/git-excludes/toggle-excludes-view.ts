import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { GitExcludesProvider } from '../../../views/git-excludes';

export function createToggleExcludesViewCommands(provider: GitExcludesProvider): Disposable[] {
  const toggle = () => provider.toggleShowAll();
  const toggleGroupMode = () => provider.toggleGroupMode();
  return [
    registerCommand(Command.ToggleExcludesShowAll, toggle),
    registerCommand(Command.ToggleExcludesShowAllActive, toggle),
    registerCommand(Command.ToggleExcludesGroupMode, toggleGroupMode),
    registerCommand(Command.ToggleExcludesGroupModeGrouped, toggleGroupMode),
  ];
}
