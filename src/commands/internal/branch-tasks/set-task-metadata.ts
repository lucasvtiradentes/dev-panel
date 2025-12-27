import { type ItemOrLineIndex, extractLineIndex } from '../../../common/utils/item-utils';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

export function createSetTaskMetadataCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.SetTaskAssignee, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const assignee = await VscodeHelper.showInputBox({
        prompt: 'Enter assignee name',
        placeHolder: 'e.g., lucas',
      });
      if (assignee === undefined) return;
      await provider.setAssignee(lineIndex, assignee ? assignee : undefined);
    }),

    registerCommand(Command.SetTaskDueDate, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const dueDate = await VscodeHelper.showInputBox({
        prompt: 'Enter due date (YYYY-MM-DD)',
        placeHolder: 'e.g., 2025-01-15',
        validateInput: (value) => {
          if (!value) return null;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return 'Use format YYYY-MM-DD';
          }
          return null;
        },
      });
      if (dueDate === undefined) return;
      await provider.setDueDate(lineIndex, dueDate ? dueDate : undefined);
    }),
  ];
}
