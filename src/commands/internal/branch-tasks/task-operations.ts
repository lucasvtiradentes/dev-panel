import * as vscode from 'vscode';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';
import type { BranchTaskItem } from '../../../views/branch-tasks/task-tree-items';

type ItemOrLineIndex = BranchTaskItem | number;

function extractLineIndex(itemOrLineIndex: ItemOrLineIndex): number {
  return typeof itemOrLineIndex === 'number' ? itemOrLineIndex : itemOrLineIndex.node.lineIndex;
}

export function createTaskOperationsCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.AddSubtask, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const text = await VscodeHelper.showInputBox({
        prompt: 'Enter subtask text',
        placeHolder: 'New subtask',
      });
      if (!text) return;
      await provider.addSubtask(lineIndex, text);
    }),

    registerCommand(Command.EditTaskText, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node) return;

      const text = await VscodeHelper.showInputBox({
        prompt: 'Edit task text',
        value: node.text,
      });
      if (!text) return;
      await provider.editTaskText(lineIndex, text);
    }),

    registerCommand(Command.DeleteBranchTask, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const confirm = await VscodeHelper.showToastMessage(
        ToastKind.Warning,
        'Delete this task?',
        { modal: true },
        'Delete',
      );
      if (confirm !== 'Delete') return;
      await provider.deleteTask(lineIndex);
    }),

    registerCommand(Command.CopyTaskText, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node) return;
      await vscode.env.clipboard.writeText(node.text);
      VscodeHelper.showToastMessage(ToastKind.Info, 'Task text copied');
    }),
  ];
}
