import { type ItemOrLineIndex, TreeItemUtils } from '../../../common/core/tree-item-utils';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchTasksProvider } from '../../../views/branch-tasks/provider';

async function handleAddSubtask(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
  const text = await VscodeHelper.showInputBox({
    prompt: 'Enter subtask text',
    placeHolder: 'New subtask',
  });
  if (!text) return;
  await provider.addSubtask(lineIndex, text);
}

async function handleEditTaskText(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
  const node = provider.findNodeByLineIndex(lineIndex);
  if (!node) return;

  const text = await VscodeHelper.showInputBox({
    prompt: 'Edit task text',
    value: node.text,
  });
  if (!text) return;
  await provider.editTaskText(lineIndex, text);
}

async function handleDeleteBranchTask(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
  const confirm = await VscodeHelper.showToastMessage(
    ToastKind.Warning,
    'Delete this task?',
    { modal: true },
    'Delete',
  );
  if (confirm !== 'Delete') return;
  await provider.deleteTask(lineIndex);
}

async function handleCopyTaskText(provider: BranchTasksProvider, item: ItemOrLineIndex) {
  const lineIndex = TreeItemUtils.extractLineIndex(item);
  const node = provider.findNodeByLineIndex(lineIndex);
  if (!node) return;
  await VscodeHelper.writeToClipboard(node.text);
  VscodeHelper.showToastMessage(ToastKind.Info, 'Task text copied');
}

export function createTaskOperationsCommands(provider: BranchTasksProvider): Disposable[] {
  return [
    registerCommand(Command.AddSubtask, (item: ItemOrLineIndex) => handleAddSubtask(provider, item)),
    registerCommand(Command.EditTaskText, (item: ItemOrLineIndex) => handleEditTaskText(provider, item)),
    registerCommand(Command.DeleteBranchTask, (item: ItemOrLineIndex) => handleDeleteBranchTask(provider, item)),
    registerCommand(Command.CopyTaskText, (item: ItemOrLineIndex) => handleCopyTaskText(provider, item)),
  ];
}
