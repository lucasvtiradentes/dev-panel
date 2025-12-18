import * as vscode from 'vscode';
import { TaskTreeDataProvider, TreeTask } from '../tree-view';

export function registerCommands(
    context: vscode.ExtensionContext,
    taskTreeDataProvider: TaskTreeDataProvider
): void {
    vscode.commands.registerCommand(
        'taskOutlinePlus.refresh',
        () => taskTreeDataProvider.refresh()
    );

    vscode.commands.registerCommand(
        'taskOutlinePlus.unhide',
        () => taskTreeDataProvider.unhide()
    );

    vscode.commands.registerCommand(
        'taskOutlinePlus.showList',
        async () => await taskTreeDataProvider.tabTaskCmd()
    );

    vscode.commands.registerCommand(
        'taskOutlinePlus.goToTask',
        async (task: TreeTask) => {
            if (
                vscode.workspace.workspaceFolders != null &&
                vscode.workspace.workspaceFolders.length > 1
            ) {
                void vscode.window.showErrorMessage(
                    "Sorry, this feature is not available in multi-root workspaces"
                );
                return;
            } else if (vscode.workspace.workspaceFolders != null) {
                const _tasksFile = vscode.Uri.parse(
                    `${vscode.workspace.workspaceFolders[0].uri.fsPath}/.vscode/tasks.json`
                );
                const _tasksFileContent = await vscode.workspace.fs.readFile(_tasksFile);

                const _lines = Buffer.from(_tasksFileContent).toString('utf-8').split('\n');
                let _ln = 0;

                for (const _line of _lines) {
                    if (_line.includes(task.label as string)) {
                        void vscode.window.showTextDocument(
                            _tasksFile,
                            {
                                selection: new vscode.Range(_ln, 0, _ln, 0)
                            }
                        );
                        return;
                    }
                    _ln++;
                }
                return;
            }

            void vscode.window.showErrorMessage("THIS IS IMPOSSIBLE!!");
        }
    );

    vscode.commands.registerCommand(
        'taskOutlinePlus.executeTask',
        async function (
            task: vscode.Task,
            scope: vscode.TaskScope | vscode.WorkspaceFolder | undefined
        ) {
            if (
                vscode.workspace.workspaceFolders != null &&
                vscode.workspace.workspaceFolders.length > 1
            ) {
                if (
                    scope != null &&
                    (scope as vscode.WorkspaceFolder).name != null
                ) {
                    await context.globalState.update(
                        "______taskRunnerPlusWorkspaceSource______",
                        (scope as vscode.WorkspaceFolder).name
                    );
                }
            }

            void vscode.tasks.executeTask(task).then(execution => {
                vscode.tasks.onDidEndTask(e => {
                    if (e.execution === execution) {
                        void context.globalState.update(
                            "______taskRunnerPlusWorkspaceSource______",
                            null
                        );
                    }
                });
            });
        }
    );

    vscode.commands.registerCommand(
        'taskOutlinePlus.execCmdline',
        async function () {
            await taskTreeDataProvider.putTaskCmd();
        }
    );

    vscode.commands.registerCommand(
        'taskOutlinePlus.exitCmdline',
        async function () {
            await taskTreeDataProvider.exitTaskCmd();
        }
    );

    vscode.commands.registerCommand(
        'taskOutlinePlus.backCmdline',
        async function () {
            await taskTreeDataProvider.backTaskCmd();
        }
    );

    vscode.commands.registerCommand(
        'taskOutlinePlus.tabCmdline',
        async function () {
            await taskTreeDataProvider.tabTaskCmd();
        }
    );
}
