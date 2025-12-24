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
import { extensionStore } from './common/lib/extension-store';
import { initGlobalState, migrateGlobalState } from './common/lib/global-state';
import { logger } from './common/lib/logger';
import { ContextKey, generateWorkspaceId, setContextKey, setWorkspaceId } from './common/lib/vscode-utils';
import { initWorkspaceState } from './common/lib/workspace-state';
import {
  registerPromptKeybindings,
  registerReplacementKeybindings,
  registerTaskKeybindings,
  registerToolKeybindings,
  registerVariableKeybindings,
} from './keybindings/register-keybindings';
import { StatusBarManager } from './status-bar/status-bar-manager';
import { BranchContextProvider } from './views/branch-context';
import { ensureTemplateExists } from './views/branch-context/template-initializer';
import { BranchTasksProvider } from './views/branch-tasks';
import { PromptTreeDataProvider } from './views/prompts';
import { reloadPromptKeybindings } from './views/prompts/keybindings-local';
import { ReplacementsProvider } from './views/replacements';
import { TaskTreeDataProvider } from './views/tasks';
import { reloadTaskKeybindings } from './views/tasks/keybindings-local';
import { ToolTreeDataProvider, setToolProviderInstance } from './views/tools';
import { reloadToolKeybindings } from './views/tools/keybindings-local';
import { VariablesProvider } from './views/variables';
import { createBranchWatcher } from './watchers/branch-watcher';
import { createConfigWatcher } from './watchers/config-watcher';
import { createKeybindingsWatcher } from './watchers/keybindings-watcher';

export function activate(context: vscode.ExtensionContext): object {
  const activateStart = Date.now();
  logger.clear();
  logger.info('=== EXTENSION ACTIVATE START ===');
  void setContextKey(ContextKey.ExtensionInitializing, true);

  initWorkspaceState(context);
  initGlobalState(context);
  migrateGlobalState();
  extensionStore.initialize(context);

  const workspaceId = generateWorkspaceId();
  setWorkspaceId(workspaceId);
  void setContextKey(ContextKey.WorkspaceId, workspaceId);
  logger.info(`Workspace ID: ${workspaceId}`);

  reloadToolKeybindings();
  reloadPromptKeybindings();
  reloadTaskKeybindings();

  const statusBarManager = new StatusBarManager();
  const taskTreeDataProvider = new TaskTreeDataProvider(context);
  const variablesProvider = new VariablesProvider();
  const replacementsProvider = new ReplacementsProvider();
  const toolTreeDataProvider = new ToolTreeDataProvider();
  setToolProviderInstance(toolTreeDataProvider);
  const promptTreeDataProvider = new PromptTreeDataProvider();
  const branchContextProvider = new BranchContextProvider();
  const branchTasksProvider = new BranchTasksProvider();

  logger.info(`[activate] Calling branchContextProvider.initialize (+${Date.now() - activateStart}ms)`);
  void branchContextProvider.initialize();
  void vscode.tasks.fetchTasks();

  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspace) {
    ensureTemplateExists(workspace);
  }

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

  vscode.window.registerTreeDataProvider(getViewIdConfigs(), variablesProvider);
  vscode.window.registerTreeDataProvider(getViewIdReplacements(), replacementsProvider);
  vscode.window.registerTreeDataProvider(getViewIdBranchContext(), branchContextProvider);
  vscode.window.registerTreeDataProvider(getViewIdTodos(), branchTasksProvider);

  context.subscriptions.push({ dispose: () => statusBarManager.dispose() });
  context.subscriptions.push({ dispose: () => taskTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => variablesProvider.dispose() });
  context.subscriptions.push({ dispose: () => replacementsProvider.dispose() });
  context.subscriptions.push({ dispose: () => toolTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => promptTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => branchContextProvider.dispose() });
  context.subscriptions.push({ dispose: () => branchTasksProvider.dispose() });

  const configWatcher = createConfigWatcher(() => {
    logger.info('Config changed, refreshing views');
    variablesProvider.refresh();
    replacementsProvider.refresh();
    toolTreeDataProvider.refresh();
    promptTreeDataProvider.refresh();
    taskTreeDataProvider.refresh();
    branchTasksProvider.refresh();
    branchContextProvider.refresh();
  });
  context.subscriptions.push(configWatcher);

  const keybindingsWatcher = createKeybindingsWatcher(() => {
    reloadToolKeybindings();
    reloadPromptKeybindings();
    reloadTaskKeybindings();

    toolTreeDataProvider.refresh();
    promptTreeDataProvider.refresh();
    replacementsProvider.refresh();
    variablesProvider.refresh();
    taskTreeDataProvider.refresh();
  });
  context.subscriptions.push(keybindingsWatcher);

  logger.info(`[activate] Creating branchWatcher (+${Date.now() - activateStart}ms)`);
  const branchWatcher = createBranchWatcher((newBranch) => {
    logger.info(`[branchWatcher] Branch changed to: ${newBranch}`);
    branchContextProvider.setBranch(newBranch, false);
    branchTasksProvider.setBranch(newBranch);
    void replacementsProvider.handleBranchChange(newBranch);
    void branchContextProvider.syncBranchContext();
  });
  context.subscriptions.push(branchWatcher);
  logger.info(`[activate] branchWatcher created (+${Date.now() - activateStart}ms)`);

  const commandDisposables = registerAllCommands({
    context,
    taskTreeDataProvider,
    toolTreeDataProvider,
    promptTreeDataProvider,
    variablesProvider,
    replacementsProvider,
    branchContextProvider,
    branchTasksProvider,
  });
  context.subscriptions.push(...commandDisposables);

  registerToolKeybindings(context);
  registerPromptKeybindings(context);
  registerReplacementKeybindings(context);
  registerVariableKeybindings(context);
  registerTaskKeybindings(context);

  void setContextKey(ContextKey.ExtensionInitializing, false);
  logger.info(`=== EXTENSION ACTIVATE END (${Date.now() - activateStart}ms) ===`);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
