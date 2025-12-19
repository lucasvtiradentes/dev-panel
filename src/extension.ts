import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import {
  GLOBAL_STATE_WORKSPACE_SOURCE,
  getViewIdConfigs,
  getViewIdReplacements,
  getViewIdTasks,
  getViewIdTools,
} from './common/constants';
import { ConfigsProvider } from './views/configs';
import { ReplacementsProvider } from './views/replacements';
import { TaskTreeDataProvider } from './views/tasks';
import { ToolTreeDataProvider } from './views/tools';

export function activate(context: vscode.ExtensionContext): object {
  const taskTreeDataProvider = new TaskTreeDataProvider(context);
  const configsProvider = new ConfigsProvider();
  const replacementsProvider = new ReplacementsProvider();
  const toolTreeDataProvider = new ToolTreeDataProvider();

  void vscode.tasks.fetchTasks();

  const tasksTreeView = vscode.window.createTreeView(getViewIdTasks(), {
    treeDataProvider: taskTreeDataProvider,
    dragAndDropController: taskTreeDataProvider.dragAndDropController,
  });
  taskTreeDataProvider.setTreeView(tasksTreeView);

  const toolsTreeView = vscode.window.createTreeView(getViewIdTools(), {
    treeDataProvider: toolTreeDataProvider,
    dragAndDropController: toolTreeDataProvider.dragAndDropController,
  });
  toolTreeDataProvider.setTreeView(toolsTreeView);

  vscode.window.registerTreeDataProvider(getViewIdConfigs(), configsProvider);
  vscode.window.registerTreeDataProvider(getViewIdReplacements(), replacementsProvider);

  context.subscriptions.push({ dispose: () => configsProvider.dispose() });
  context.subscriptions.push({ dispose: () => replacementsProvider.dispose() });
  context.subscriptions.push({ dispose: () => toolTreeDataProvider.dispose() });

  const commandDisposables = registerAllCommands(context, taskTreeDataProvider, toolTreeDataProvider);
  context.subscriptions.push(...commandDisposables);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
