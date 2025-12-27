import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import { TaskPriority } from '../../../common/schemas';
import { type ItemOrLineIndex, extractLineIndex } from '../../../common/utils/item-utils';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable, QuickPickItem } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

async function pickPriority(): Promise<TaskPriority | undefined> {
  const items: QuickPickItem[] = [
    { label: '🔴 Urgent', description: 'Critical priority' },
    { label: '🟠 High', description: 'High priority' },
    { label: '🟡 Medium', description: 'Medium priority' },
    { label: '🔵 Low', description: 'Low priority' },
    { label: '○ None', description: 'No priority' },
  ];

  const picked = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: 'Select priority',
  });

  if (!picked) return undefined;

  const priorityMap: Record<string, TaskPriority> = {
    '🔴 Urgent': TaskPriority.Urgent,
    '🟠 High': TaskPriority.High,
    '🟡 Medium': TaskPriority.Medium,
    '🔵 Low': TaskPriority.Low,
    '○ None': TaskPriority.None,
  };

  return priorityMap[picked.label];
}

export function createSetTaskPriorityCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.SetTaskPriority, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const priority = await pickPriority();
      if (!priority) return;
      await provider.setPriority(lineIndex, priority);
    }),

    registerCommand(Command.SetTaskPriorityUrgent, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.Urgent);
    }),

    registerCommand(Command.SetTaskPriorityHigh, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.High);
    }),

    registerCommand(Command.SetTaskPriorityMedium, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.Medium);
    }),

    registerCommand(Command.SetTaskPriorityLow, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.Low);
    }),

    registerCommand(Command.SetTaskPriorityNone, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.None);
    }),
  ];
}
