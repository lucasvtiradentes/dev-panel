import { type ItemOrLineIndex, TreeItemUtils } from '../../../common/core/tree-item-utils';
import { TaskPriority } from '../../../common/schemas';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { pickPriority } from '../../../common/vscode/vscode-inputs';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

async function handleSetTaskPriority(provider: BranchTasksProvider, item: ItemOrLineIndex, priority: TaskPriority) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
  await provider.setPriority(lineIndex, priority);
}

async function handleSetTaskPriorityWithPicker(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
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
