import { registerAllCommands } from './commands/register-all';
import {
  GLOBAL_STATE_WORKSPACE_SOURCE,
  getViewIdConfigs,
  getViewIdExcludes,
  getViewIdReplacements,
  getViewIdTasksExplorer,
  getViewIdTasksPanel,
  getViewIdVscodeExcludes,
} from './common/constants';
import { extensionStore } from './common/core/extension-store';
import { workspaceManager } from './common/core/workspace-manager';
import { logger } from './common/lib/logger';
import { initWorkspaceState } from './common/state';
import { ContextKey, setContextKey } from './common/vscode/vscode-context';
import { VscodeHelper } from './common/vscode/vscode-helper';
import type { Disposable, ExtensionContext, TreeView } from './common/vscode/vscode-types';
import {
  ExtensionConfigKey,
  generateWorkspaceId,
  getExtensionConfig,
  getExtensionConfigSection,
  setWorkspaceId,
} from './common/vscode/vscode-workspace';
import { StatusBarManager } from './status-bar/status-bar-manager';
import { ExcludesProvider } from './views/excludes';
import { ReplacementsProvider } from './views/replacements';
import { registerReplacementKeybindings } from './views/replacements/keybindings-local';
import { type GroupTreeItem, TaskTreeDataProvider, type TreeTask, type WorkspaceTreeItem } from './views/tasks';
import { registerTaskKeybindings, reloadTaskKeybindings } from './views/tasks/keybindings-local';
import { VariablesProvider } from './views/variables';
import { registerVariableKeybindings, reloadVariableKeybindings } from './views/variables/keybindings-local';
import { VscodeExcludesProvider } from './views/vscode-excludes';
import { createConfigWatcher } from './watchers/config-watcher';
import { createExcludesWatcher } from './watchers/excludes-watcher';
import { createKeybindingsWatcher } from './watchers/keybindings-watcher';
import { createTaskSourcesWatcher } from './watchers/task-sources-watcher';

type Providers = {
  statusBarManager: StatusBarManager;
  taskTreeDataProvider: TaskTreeDataProvider;
  variablesProvider: VariablesProvider;
  replacementsProvider: ReplacementsProvider;
  excludesProvider: ExcludesProvider;
  vscodeExcludesProvider: VscodeExcludesProvider;
};

function setupStatesAndContext(context: ExtensionContext) {
  initWorkspaceState(context);
  extensionStore.initialize(context);
  workspaceManager.initialize(context);

  const workspaceId = generateWorkspaceId();
  setWorkspaceId(workspaceId);
  void setContextKey(ContextKey.WorkspaceId, workspaceId);
  logger.info(`Workspace ID: ${workspaceId}`);
}

function setupInitialKeybindings() {
  reloadTaskKeybindings();
  reloadVariableKeybindings();
}

function setupProviders(): Providers {
  const statusBarManager = new StatusBarManager();
  const taskTreeDataProvider = new TaskTreeDataProvider();
  const variablesProvider = new VariablesProvider();
  const replacementsProvider = new ReplacementsProvider();
  const excludesProvider = new ExcludesProvider();
  const vscodeExcludesProvider = new VscodeExcludesProvider();

  void VscodeHelper.fetchTasks();

  return {
    statusBarManager,
    taskTreeDataProvider,
    variablesProvider,
    replacementsProvider,
    excludesProvider,
    vscodeExcludesProvider,
  };
}

type TaskTreeItem = TreeTask | GroupTreeItem | WorkspaceTreeItem;

type TasksTreeViews = {
  explorerView: TreeView<TaskTreeItem>;
  panelView: TreeView<TaskTreeItem>;
};

function setupTreeViews(providers: Providers): TasksTreeViews {
  const tasksLocation = getExtensionConfig(ExtensionConfigKey.TasksLocation);
  const dndController = providers.taskTreeDataProvider.dragAndDropController;

  const explorerView = VscodeHelper.createTreeView(getViewIdTasksExplorer(), {
    treeDataProvider: providers.taskTreeDataProvider,
    dragAndDropController: dndController,
  });

  const panelView = VscodeHelper.createTreeView(getViewIdTasksPanel(), {
    treeDataProvider: providers.taskTreeDataProvider,
    dragAndDropController: dndController,
  });

  const activeView = tasksLocation === 'explorer' ? explorerView : panelView;
  providers.taskTreeDataProvider.setTreeView(activeView);

  VscodeHelper.registerTreeDataProvider(getViewIdConfigs(), providers.variablesProvider);
  VscodeHelper.registerTreeDataProvider(getViewIdReplacements(), providers.replacementsProvider);
  VscodeHelper.registerTreeDataProvider(getViewIdExcludes(), providers.excludesProvider);
  VscodeHelper.registerTreeDataProvider(getViewIdVscodeExcludes(), providers.vscodeExcludesProvider);

  return { explorerView, panelView };
}

function setupDisposables(context: ExtensionContext, providers: Providers, tasksViews: TasksTreeViews) {
  context.subscriptions.push(tasksViews.explorerView as Disposable);
  context.subscriptions.push(tasksViews.panelView as Disposable);
  context.subscriptions.push({ dispose: () => providers.statusBarManager.dispose() });
  context.subscriptions.push({ dispose: () => providers.taskTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.variablesProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.replacementsProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.excludesProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.vscodeExcludesProvider.dispose() });
  context.subscriptions.push(workspaceManager);
}

function setupConfigChangeListener(context: ExtensionContext, providers: Providers, tasksViews: TasksTreeViews) {
  const configSection = getExtensionConfigSection();

  const configWatcher = VscodeHelper.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('files.exclude')) {
      providers.vscodeExcludesProvider.refresh();
    }

    if (e.affectsConfiguration(`${configSection}.${ExtensionConfigKey.TasksLocation}`)) {
      const newLocation = getExtensionConfig(ExtensionConfigKey.TasksLocation);
      const activeView = newLocation === 'explorer' ? tasksViews.explorerView : tasksViews.panelView;
      providers.taskTreeDataProvider.setTreeView(activeView);
      providers.taskTreeDataProvider.refresh();
      logger.info(`Tasks location changed to: ${newLocation}`);
    }
  });

  context.subscriptions.push(configWatcher);
}

function setupWatchers(context: ExtensionContext, providers: Providers) {
  const configWatcher = createConfigWatcher(() => {
    logger.info('Config changed, refreshing views');
    providers.variablesProvider.refresh();
    providers.replacementsProvider.refresh();
    providers.taskTreeDataProvider.refresh();
  });
  context.subscriptions.push(configWatcher);

  const keybindingsWatcher = createKeybindingsWatcher(() => {
    reloadTaskKeybindings();
    reloadVariableKeybindings();

    providers.replacementsProvider.refresh();
    providers.variablesProvider.refresh();
    providers.taskTreeDataProvider.refresh();
  });
  context.subscriptions.push(keybindingsWatcher);

  const taskSourcesWatcher = createTaskSourcesWatcher(() => {
    providers.taskTreeDataProvider.refresh();
  });
  context.subscriptions.push(taskSourcesWatcher);

  const excludesWatcher = createExcludesWatcher(() => {
    providers.excludesProvider.refresh();
  });
  context.subscriptions.push(excludesWatcher);

  const workspaceSubscription = workspaceManager.onDidChangeActiveWorkspace(() => {
    const workspaceId = generateWorkspaceId();
    setWorkspaceId(workspaceId);
    void setContextKey(ContextKey.WorkspaceId, workspaceId);
    providers.taskTreeDataProvider.reloadWorkspaceState();
    providers.variablesProvider.reloadWorkspaceState();
    providers.replacementsProvider.reloadWorkspaceState();
    providers.excludesProvider.reloadWorkspaceState();
    providers.vscodeExcludesProvider.reloadWorkspaceState();
    reloadTaskKeybindings();
    reloadVariableKeybindings();
  });
  context.subscriptions.push(workspaceSubscription);

  logger.info('[extension] [setupWatchers] All watchers registered');
}

function setupCommands(context: ExtensionContext, providers: Providers) {
  const commandDisposables = registerAllCommands({
    context,
    taskTreeDataProvider: providers.taskTreeDataProvider,
    variablesProvider: providers.variablesProvider,
    replacementsProvider: providers.replacementsProvider,
    excludesProvider: providers.excludesProvider,
    vscodeExcludesProvider: providers.vscodeExcludesProvider,
  });
  context.subscriptions.push(...commandDisposables);

  registerReplacementKeybindings(context);
  registerVariableKeybindings(context);
  registerTaskKeybindings(context);
}

export function activate(context: ExtensionContext): object {
  const activateStart = Date.now();
  logger.clear();
  logger.info('=== EXTENSION ACTIVATE START ===');

  const hasWorkspace = VscodeHelper.getAllWorkspaceFolders().length > 0;
  if (!hasWorkspace) {
    logger.info('No workspace found, skipping extension initialization');
    return {};
  }

  void setContextKey(ContextKey.ExtensionInitializing, true);

  setupStatesAndContext(context);
  setupInitialKeybindings();

  const providers = setupProviders();
  const tasksViews = setupTreeViews(providers);
  setupDisposables(context, providers, tasksViews);
  setupConfigChangeListener(context, providers, tasksViews);
  setupWatchers(context, providers);
  setupCommands(context, providers);

  void setContextKey(ContextKey.ExtensionInitializing, false);
  logger.info(`=== EXTENSION ACTIVATE END (${Date.now() - activateStart}ms) ===`);

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

// tscanner-ignore-next-line no-empty-function
export function deactivate() {}
