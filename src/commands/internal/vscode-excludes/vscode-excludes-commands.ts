import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { type VscodeExcludeTreeItem, VscodeExcludesProvider } from '../../../views/vscode-excludes';

export function createVscodeExcludesCommands(provider: VscodeExcludesProvider): Disposable[] {
  return [
    registerCommand(Command.ToggleVscodeExclude, async (treeItem?: VscodeExcludeTreeItem) => {
      if (!treeItem) return;
      await VscodeExcludesProvider.toggle(treeItem.item.pattern, treeItem.item.excluded);
      provider.refresh();
    }),
    registerCommand(Command.AddVscodeExclude, async () => {
      const pattern = await VscodeHelper.showInputBox({
        prompt: 'Enter a file, folder, or glob to exclude from the VS Code Explorer',
        placeHolder: 'e.g. generated/, *.log, **/cache',
      });
      if (!pattern) return;
      await VscodeExcludesProvider.add(pattern);
      provider.refresh();
    }),
    registerCommand(Command.ToggleVscodeExcludesShowAll, () => provider.toggleShowAll()),
    registerCommand(Command.ToggleVscodeExcludesShowAllActive, () => provider.toggleShowAll()),
    registerCommand(Command.ToggleVscodeExcludesGroupMode, () => provider.toggleGroupMode()),
    registerCommand(Command.ToggleVscodeExcludesGroupModeGrouped, () => provider.toggleGroupMode()),
    registerCommand(Command.OpenVscodeExcludesSettings, () =>
      VscodeHelper.executeCommand('workbench.action.openWorkspaceSettingsFile'),
    ),
  ];
}
