import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import {
  GLOBAL_STATE_WORKSPACE_SOURCE,
  getViewIdBranchContext,
  getViewIdConfigs,
  getViewIdPrompts,
  getViewIdReplacements,
  getViewIdTasks,
  getViewIdTools,
} from './common/constants';
import { logger } from './common/lib/logger';
import { BranchContextProvider } from './views/branch-context';
import { ConfigsProvider } from './views/configs';
import { PromptTreeDataProvider } from './views/prompts';
import { ReplacementsProvider } from './views/replacements';
import { TaskTreeDataProvider } from './views/tasks';
import { ToolTreeDataProvider } from './views/tools';
import { createStateWatcher } from './watchers/state-watcher';

export function activate(context: vscode.ExtensionContext): object {
  logger.clear();
  logger.info('Better Project Tools extension activated');
  const taskTreeDataProvider = new TaskTreeDataProvider(context);
  const configsProvider = new ConfigsProvider();
  const replacementsProvider = new ReplacementsProvider();
  const toolTreeDataProvider = new ToolTreeDataProvider();
  const promptTreeDataProvider = new PromptTreeDataProvider();
  const branchContextProvider = new BranchContextProvider();

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

  context.subscriptions.push({ dispose: () => configsProvider.dispose() });
  context.subscriptions.push({ dispose: () => replacementsProvider.dispose() });
  context.subscriptions.push({ dispose: () => toolTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => promptTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => branchContextProvider.dispose() });

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
    branchContextProvider,
  );
  context.subscriptions.push(...commandDisposables);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
