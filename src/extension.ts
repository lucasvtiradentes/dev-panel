import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import {
  GLOBAL_STATE_WORKSPACE_SOURCE,
  getViewIdConfigs,
  getViewIdReplacements,
  getViewIdTasks,
} from './common/constants';
import { ConfigsProvider } from './views/configs';
import { ReplacementsProvider } from './views/replacements';
import { TaskTreeDataProvider } from './views/tasks';

export function activate(context: vscode.ExtensionContext): object {
  const taskTreeDataProvider = new TaskTreeDataProvider(context);
  const configsProvider = new ConfigsProvider();
  const replacementsProvider = new ReplacementsProvider();

  void vscode.tasks.fetchTasks();

  const tasksTreeView = vscode.window.createTreeView(getViewIdTasks(), {
    treeDataProvider: taskTreeDataProvider,
  });
  taskTreeDataProvider.setTreeView(tasksTreeView);

  vscode.window.registerTreeDataProvider(getViewIdConfigs(), configsProvider);
  vscode.window.registerTreeDataProvider(getViewIdReplacements(), replacementsProvider);

  context.subscriptions.push({ dispose: () => configsProvider.dispose() });
  context.subscriptions.push({ dispose: () => replacementsProvider.dispose() });

  const commandDisposables = registerAllCommands(context, taskTreeDataProvider);
  context.subscriptions.push(...commandDisposables);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
