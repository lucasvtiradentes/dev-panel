import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import {
  GLOBAL_STATE_WORKSPACE_SOURCE,
  getCommandId,
  getViewId,
  getViewIdHello1,
  getViewIdHello2,
} from './common/constants';
import { HelloView1Provider, selectConfigOption } from './views/hello1';
import { HelloView2Provider, revertAllReplacements, toggleReplacement } from './views/hello2';
import { TaskTreeDataProvider } from './views/tasks';

export function activate(context: vscode.ExtensionContext): object {
  const taskTreeDataProvider = new TaskTreeDataProvider(context);
  const hello1Provider = new HelloView1Provider();
  const hello2Provider = new HelloView2Provider();

  void vscode.tasks.fetchTasks();

  vscode.window.registerTreeDataProvider(getViewId(), taskTreeDataProvider);
  vscode.window.registerTreeDataProvider(getViewIdHello1(), hello1Provider);
  vscode.window.registerTreeDataProvider(getViewIdHello2(), hello2Provider);

  const selectConfigCmd = vscode.commands.registerCommand(getCommandId('selectConfigOption'), selectConfigOption);
  const toggleReplacementCmd = vscode.commands.registerCommand(getCommandId('toggleReplacement'), toggleReplacement);
  const revertAllCmd = vscode.commands.registerCommand(getCommandId('revertAllReplacements'), revertAllReplacements);

  context.subscriptions.push(selectConfigCmd, toggleReplacementCmd, revertAllCmd);
  context.subscriptions.push({ dispose: () => hello1Provider.dispose() });
  context.subscriptions.push({ dispose: () => hello2Provider.dispose() });

  const commandDisposables = registerAllCommands(context, taskTreeDataProvider);
  context.subscriptions.push(...commandDisposables);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
