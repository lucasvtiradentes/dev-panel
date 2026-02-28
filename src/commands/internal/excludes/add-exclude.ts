import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { addExcludeEntry, getProvider } from '../../../views/excludes';

export function createAddExcludeCommand(): Disposable {
  return registerCommand(Command.AddExclude, async () => {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    const pattern = await VscodeHelper.showInputBox({
      prompt: 'Enter pattern to exclude (file, folder, or glob)',
      placeHolder: 'e.g., *.log, temp/, .env.local',
    });

    if (!pattern) return;

    const result = addExcludeEntry(workspace, pattern);

    if (!result.success) {
      if (result.reason === 'duplicate') {
        void VscodeHelper.showToastMessage(ToastKind.Warning, `Pattern "${pattern}" already exists`);
      } else if (result.reason === 'invalid_pattern') {
        void VscodeHelper.showToastMessage(ToastKind.Error, 'Invalid pattern (cannot start with #)');
      } else if (result.reason === 'file_error') {
        void VscodeHelper.showToastMessage(ToastKind.Error, 'Failed to write exclude file');
      }
      return;
    }

    getProvider()?.refresh();
  });
}
