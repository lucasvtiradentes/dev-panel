import { type ItemOrLineIndex, TreeItemUtils } from '../../../common/core/tree-item-utils';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

async function handleSetTaskAssignee(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
  const assignee = await VscodeHelper.showInputBox({
    prompt: 'Enter assignee name',
    placeHolder: 'e.g., lucas',
  });
  if (assignee === undefined) return;
  await provider.setAssignee(lineIndex, assignee ? assignee : undefined);
}

async function handleSetTaskDueDate(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
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
}

export function createSetTaskMetadataCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.SetTaskAssignee, (item: ItemOrLineIndex) => handleSetTaskAssignee(provider, item)),
    registerCommand(Command.SetTaskDueDate, (item: ItemOrLineIndex) => handleSetTaskDueDate(provider, item)),
  ];
}
