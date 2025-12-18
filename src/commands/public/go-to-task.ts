import * as vscode from 'vscode';
import {
    Command,
    ToastKind,
    getWorkspaceFolders,
    isMultiRootWorkspace,
    openDocumentAtLine,
    registerCommand,
    showToastMessage,
} from '../../common';
import type { TreeTask } from '../../tree-view';

export function createGoToTaskCommand() {
    return registerCommand(Command.GoToTask, async (task: TreeTask) => {
        if (isMultiRootWorkspace()) {
            showToastMessage(ToastKind.Error, 'Sorry, this feature is not available in multi-root workspaces');
            return;
        }

        const folders = getWorkspaceFolders();
        if (!folders || folders.length === 0) {
            showToastMessage(ToastKind.Error, 'No workspace folder found');
            return;
        }

        const tasksFileUri = vscode.Uri.parse(`${folders[0].uri.fsPath}/.vscode/tasks.json`);
        const tasksFileContent = await vscode.workspace.fs.readFile(tasksFileUri);
        const lines = Buffer.from(tasksFileContent).toString('utf-8').split('\n');

        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            if (lines[lineNumber].includes(task.label as string)) {
                await openDocumentAtLine(tasksFileUri, lineNumber);
                return;
            }
        }
    });
}
