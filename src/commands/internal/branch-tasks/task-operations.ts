import { type ItemOrLineIndex, extractLineIndex } from '../../../common/utils/item-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

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
      await VscodeHelper.writeToClipboard(node.text);
      VscodeHelper.showToastMessage(ToastKind.Info, 'Task text copied');
    }),
  ];
}
