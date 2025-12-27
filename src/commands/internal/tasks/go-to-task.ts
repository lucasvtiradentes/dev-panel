import * as vscode from 'vscode';
import { VSCODE_TASKS_PATH } from '../../../common/constants';
import { Command, getWorkspaceFolders, isMultiRootWorkspace, registerCommand } from '../../../common/lib/vscode-utils';
import { TypeGuards } from '../../../common/utils/type-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { TreeTask } from '../../../views/tasks';

export function createGoToTaskCommand() {
  return registerCommand(Command.GoToTask, async (task: TreeTask) => {
    if (isMultiRootWorkspace()) {
      VscodeHelper.showToastMessage(ToastKind.Error, 'Sorry, this feature is not available in multi-root workspaces');
      return;
    }

    const folders = getWorkspaceFolders();
    if (!folders || !TypeGuards.isNonEmptyArray(folders)) {
      VscodeHelper.showToastMessage(ToastKind.Error, 'No workspace folder found');
      return;
    }

    const tasksFileUri = vscode.Uri.parse(`${folders[0].uri.fsPath}/${VSCODE_TASKS_PATH}`);
    const tasksFileContent = await VscodeHelper.readFile(tasksFileUri);
    const lines = Buffer.from(tasksFileContent).toString('utf-8').split('\n');

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      if (lines[lineNumber].includes(task.label as string)) {
        await VscodeHelper.openDocumentAtLine(tasksFileUri, lineNumber);
        return;
      }
    }
  });
}
