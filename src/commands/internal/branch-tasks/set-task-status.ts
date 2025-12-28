import { type ItemOrLineIndex, TreeItemUtils } from '../../../common/core/tree-item-utils';
import { TaskStatus } from '../../../common/schemas';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { pickStatus } from '../../../common/vscode/vscode-inputs';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

async function handleSetTaskStatus(provider: BranchTasksProvider, item: ItemOrLineIndex, status: TaskStatus) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
  await provider.setStatus(lineIndex, status);
}

async function handleSetTaskStatusWithPicker(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
  const status = await pickStatus();
  if (!status) return;
  await provider.setStatus(lineIndex, status);
}

export function createSetTaskStatusCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.SetTaskStatus, (item: ItemOrLineIndex) => handleSetTaskStatusWithPicker(provider, item)),
    registerCommand(Command.SetTaskStatusTodo, (item: ItemOrLineIndex) =>
      handleSetTaskStatus(provider, item, TaskStatus.Todo),
    ),
    registerCommand(Command.SetTaskStatusDoing, (item: ItemOrLineIndex) =>
      handleSetTaskStatus(provider, item, TaskStatus.Doing),
    ),
    registerCommand(Command.SetTaskStatusDone, (item: ItemOrLineIndex) =>
      handleSetTaskStatus(provider, item, TaskStatus.Done),
    ),
    registerCommand(Command.SetTaskStatusBlocked, (item: ItemOrLineIndex) =>
      handleSetTaskStatus(provider, item, TaskStatus.Blocked),
    ),
  ];
}
