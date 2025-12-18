import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import { GLOBAL_STATE_WORKSPACE_SOURCE, getViewId, getViewIdHello1, getViewIdHello2 } from './common/constants';
import { HelloView1Provider } from './views/hello1';
import { HelloView2Provider } from './views/hello2';
import { TaskTreeDataProvider } from './views/tasks';

export function activate(context: vscode.ExtensionContext): object {
  const taskTreeDataProvider = new TaskTreeDataProvider(context);
  const hello1Provider = new HelloView1Provider();
  const hello2Provider = new HelloView2Provider();

  void vscode.tasks.fetchTasks();

  vscode.window.registerTreeDataProvider(getViewId(), taskTreeDataProvider);
  vscode.window.registerTreeDataProvider(getViewIdHello1(), hello1Provider);
  vscode.window.registerTreeDataProvider(getViewIdHello2(), hello2Provider);

  const commandDisposables = registerAllCommands(context, taskTreeDataProvider);
  context.subscriptions.push(...commandDisposables);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
