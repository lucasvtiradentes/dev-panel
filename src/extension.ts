import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import { GLOBAL_STATE_WORKSPACE_SOURCE, getViewId } from './common/constants';
import { TaskTreeDataProvider } from './views/tasks';

export function activate(context: vscode.ExtensionContext): object {
  const taskTreeDataProvider = new TaskTreeDataProvider(context);

  void vscode.tasks.fetchTasks();

  vscode.window.registerTreeDataProvider(getViewId(), taskTreeDataProvider);

  const commandDisposables = registerAllCommands(context, taskTreeDataProvider);
  context.subscriptions.push(...commandDisposables);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
