import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import { TaskStatus } from '../../../common/schemas';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable, QuickPickItem } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';
import type { BranchTaskItem } from '../../../views/branch-tasks/task-tree-items';

type ItemOrLineIndex = BranchTaskItem | number;

function extractLineIndex(itemOrLineIndex: ItemOrLineIndex): number {
  return typeof itemOrLineIndex === 'number' ? itemOrLineIndex : itemOrLineIndex.node.lineIndex;
}

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

export function createSetTaskStatusCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.SetTaskStatus, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const status = await pickStatus();
      if (!status) return;
      await provider.setStatus(lineIndex, status);
    }),

    registerCommand(Command.SetTaskStatusTodo, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setStatus(lineIndex, TaskStatus.Todo);
    }),

    registerCommand(Command.SetTaskStatusDoing, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setStatus(lineIndex, TaskStatus.Doing);
    }),

    registerCommand(Command.SetTaskStatusDone, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setStatus(lineIndex, TaskStatus.Done);
    }),

    registerCommand(Command.SetTaskStatusBlocked, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setStatus(lineIndex, TaskStatus.Blocked);
    }),
  ];
}
