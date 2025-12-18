import * as vscode from 'vscode';
import { TaskTreeDataProvider } from './tree-view';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext): object {
    const taskTreeDataProvider = new TaskTreeDataProvider(context);

    void vscode.tasks.fetchTasks();

    vscode.window.registerTreeDataProvider('taskOutlinePlus', taskTreeDataProvider);

    registerCommands(context, taskTreeDataProvider);

    return {
        taskSource() {
            return context.globalState.get("______taskRunnerPlusWorkspaceSource______");
        }
    };
}

export function deactivate(): void {
}
