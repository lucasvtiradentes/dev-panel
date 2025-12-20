import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import {
  GLOBAL_STATE_WORKSPACE_SOURCE,
  getViewIdBranchContext,
  getViewIdConfigs,
  getViewIdPrompts,
  getViewIdReplacements,
  getViewIdTasks,
  getViewIdTodos,
  getViewIdTools,
} from './common/constants';
import { logger } from './common/lib/logger';
import { initWorkspaceState } from './common/lib/workspace-state';
import { BranchContextProvider } from './views/branch-context';
import { ConfigsProvider } from './views/configs';
import { PromptTreeDataProvider } from './views/prompts';
import { ReplacementsProvider } from './views/replacements';
import { TaskTreeDataProvider } from './views/tasks';
import { TodosProvider } from './views/todos';
import { ToolTreeDataProvider } from './views/tools';
import { createConfigWatcher } from './watchers/config-watcher';

export function activate(context: vscode.ExtensionContext): object {
  logger.clear();
  logger.info('Better Project Tools extension activated');
  initWorkspaceState(context);
  const taskTreeDataProvider = new TaskTreeDataProvider(context);
  const configsProvider = new ConfigsProvider();
  const replacementsProvider = new ReplacementsProvider();
  const toolTreeDataProvider = new ToolTreeDataProvider();
  const promptTreeDataProvider = new PromptTreeDataProvider();
  const branchContextProvider = new BranchContextProvider();
  const todosProvider = new TodosProvider();

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
  vscode.window.registerTreeDataProvider(getViewIdBranchContext(), branchContextProvider);
  vscode.window.registerTreeDataProvider(getViewIdTodos(), todosProvider);

  context.subscriptions.push({ dispose: () => configsProvider.dispose() });
  context.subscriptions.push({ dispose: () => replacementsProvider.dispose() });
  context.subscriptions.push({ dispose: () => toolTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => promptTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => branchContextProvider.dispose() });
  context.subscriptions.push({ dispose: () => todosProvider.dispose() });

  const configWatcher = createConfigWatcher(() => {
    logger.info('Config changed, refreshing views');
    configsProvider.refresh();
    replacementsProvider.refresh();
    toolTreeDataProvider.refresh();
    promptTreeDataProvider.refresh();
    taskTreeDataProvider.refresh();
  });
  context.subscriptions.push(configWatcher);

  const commandDisposables = registerAllCommands(
    context,
    taskTreeDataProvider,
    toolTreeDataProvider,
    promptTreeDataProvider,
    configsProvider,
    replacementsProvider,
    branchContextProvider,
    todosProvider,
  );
  context.subscriptions.push(...commandDisposables);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
