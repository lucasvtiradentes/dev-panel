import { TaskPriority } from '../../../common/schemas';
import { type ItemOrLineIndex, extractLineIndex } from '../../../common/utils/item-utils';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable, QuickPickItem } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
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

async function handleSetTaskPriority(provider: BranchTasksProvider, item: ItemOrLineIndex, priority: TaskPriority) {
  const lineIndex = extractLineIndex(item);
  await provider.setPriority(lineIndex, priority);
}

async function handleSetTaskPriorityWithPicker(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = extractLineIndex(item);
  const priority = await pickPriority();
  if (!priority) return;
  await provider.setPriority(lineIndex, priority);
}

export function createSetTaskPriorityCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.SetTaskPriority, (item: ItemOrLineIndex) =>
      handleSetTaskPriorityWithPicker(provider, item),
    ),
    registerCommand(Command.SetTaskPriorityUrgent, (item: ItemOrLineIndex) =>
      handleSetTaskPriority(provider, item, TaskPriority.Urgent),
    ),
    registerCommand(Command.SetTaskPriorityHigh, (item: ItemOrLineIndex) =>
      handleSetTaskPriority(provider, item, TaskPriority.High),
    ),
    registerCommand(Command.SetTaskPriorityMedium, (item: ItemOrLineIndex) =>
      handleSetTaskPriority(provider, item, TaskPriority.Medium),
    ),
    registerCommand(Command.SetTaskPriorityLow, (item: ItemOrLineIndex) =>
      handleSetTaskPriority(provider, item, TaskPriority.Low),
    ),
    registerCommand(Command.SetTaskPriorityNone, (item: ItemOrLineIndex) =>
      handleSetTaskPriority(provider, item, TaskPriority.None),
    ),
  ];
}
