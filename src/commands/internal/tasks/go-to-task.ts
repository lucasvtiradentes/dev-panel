import { VSCODE_TASKS_PATH } from '../../../common/constants';
import { FileIOHelper } from '../../../common/lib/node-helper';
import { TypeGuards } from '../../../common/utils/common-utils';
import { PathHelper } from '../../../common/utils/path-helper';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import { Command, isMultiRootWorkspace, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TreeTask } from '../../../views/tasks';

export function createGoToTaskCommand() {
  return registerCommand(Command.GoToTask, async (task: TreeTask) => {
    if (isMultiRootWorkspace()) {
      VscodeHelper.showToastMessage(ToastKind.Error, 'Sorry, this feature is not available in multi-root workspaces');
      return;
    }

    const folders = VscodeHelper.getWorkspaceFolders();
    if (!TypeGuards.isNonEmptyArray(folders)) {
      VscodeHelper.showToastMessage(ToastKind.Error, 'No workspace folder found');
      return;
    }

    const tasksFilePath = PathHelper.join(folders[0].uri.fsPath, VSCODE_TASKS_PATH);
    const tasksFileUri = VscodeHelper.createFileUri(tasksFilePath);
    const tasksFileContent = FileIOHelper.readFile(tasksFilePath);
    const lines = tasksFileContent.split('\n');

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      if (lines[lineNumber].includes(task.label as string)) {
        await VscodeHelper.openDocumentAtLine(tasksFileUri, lineNumber);
        return;
      }
    }
  });
}
