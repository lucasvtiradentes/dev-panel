import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import {
  GLOBAL_STATE_WORKSPACE_SOURCE,
  getViewIdConfigs,
  getViewIdPrompts,
  getViewIdReplacements,
  getViewIdTasks,
  getViewIdTools,
} from './common/constants';
import { ConfigsProvider } from './views/configs';
import { PromptTreeDataProvider } from './views/prompts';
import { ReplacementsProvider } from './views/replacements';
import { TaskTreeDataProvider } from './views/tasks';
import { ToolTreeDataProvider } from './views/tools';
import { createStateWatcher } from './watchers/state-watcher';

export function activate(context: vscode.ExtensionContext): object {
  const taskTreeDataProvider = new TaskTreeDataProvider(context);
  const configsProvider = new ConfigsProvider();
  const replacementsProvider = new ReplacementsProvider();
  const toolTreeDataProvider = new ToolTreeDataProvider();
  const promptTreeDataProvider = new PromptTreeDataProvider();

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

  const promptsTreeView = vscode.window.createTreeView(getViewIdPrompts(), {
    treeDataProvider: promptTreeDataProvider,
    dragAndDropController: promptTreeDataProvider.dragAndDropController,
  });
  promptTreeDataProvider.setTreeView(promptsTreeView);

  vscode.window.registerTreeDataProvider(getViewIdConfigs(), configsProvider);
  vscode.window.registerTreeDataProvider(getViewIdReplacements(), replacementsProvider);

  context.subscriptions.push({ dispose: () => configsProvider.dispose() });
  context.subscriptions.push({ dispose: () => replacementsProvider.dispose() });
  context.subscriptions.push({ dispose: () => toolTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => promptTreeDataProvider.dispose() });

  const stateWatcher = createStateWatcher(() => {
    taskTreeDataProvider.refresh();
    toolTreeDataProvider.refresh();
    promptTreeDataProvider.refresh();
  });
  context.subscriptions.push(stateWatcher);

  const commandDisposables = registerAllCommands(
    context,
    taskTreeDataProvider,
    toolTreeDataProvider,
    promptTreeDataProvider,
  );
  context.subscriptions.push(...commandDisposables);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
