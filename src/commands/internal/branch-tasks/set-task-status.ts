import { TaskStatus } from '../../../common/schemas';
import { type ItemOrLineIndex, extractLineIndex } from '../../../common/utils/item-utils';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable, QuickPickItem } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

async function pickStatus(): Promise<TaskStatus | undefined> {
  const items: QuickPickItem[] = [
    { label: '$(circle-large-outline) Todo', description: 'Not started' },
    { label: '$(play-circle) Doing', description: 'In progress' },
    { label: '$(pass-filled) Done', description: 'Completed' },
    { label: '$(error) Blocked', description: 'Blocked by something' },
  ];

  const picked = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: 'Select status',
  });

  if (!picked) return undefined;

  const statusMap: Record<string, TaskStatus> = {
    '$(circle-large-outline) Todo': TaskStatus.Todo,
    '$(play-circle) Doing': TaskStatus.Doing,
    '$(pass-filled) Done': TaskStatus.Done,
    '$(error) Blocked': TaskStatus.Blocked,
  };

  return statusMap[picked.label];
}

async function handleSetTaskStatus(provider: BranchTasksProvider, item: ItemOrLineIndex, status: TaskStatus) {
  const lineIndex = extractLineIndex(item);
  await provider.setStatus(lineIndex, status);
}

async function handleSetTaskStatusWithPicker(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = extractLineIndex(item);
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
