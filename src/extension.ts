import { registerAllCommands } from './commands/register-all';
import {
  GLOBAL_STATE_WORKSPACE_SOURCE,
  getViewIdConfigs,
  getViewIdReplacements,
  getViewIdTasks,
} from './common/constants';
import { ConfigManager } from './common/core/config-manager';
import { extensionStore } from './common/core/extension-store';
import { logger } from './common/lib/logger';
import { initGlobalState, initWorkspaceState } from './common/state';
import { ContextKey, setContextKey } from './common/vscode/vscode-context';
import { VscodeHelper } from './common/vscode/vscode-helper';
import type { ExtensionContext } from './common/vscode/vscode-types';
import { generateWorkspaceId, setWorkspaceId } from './common/vscode/vscode-workspace';
import { StatusBarManager } from './status-bar/status-bar-manager';
import { ReplacementsProvider } from './views/replacements';
import { registerReplacementKeybindings } from './views/replacements/keybindings-local';
import { TaskTreeDataProvider } from './views/tasks';
import { registerTaskKeybindings, reloadTaskKeybindings } from './views/tasks/keybindings-local';
import { VariablesProvider, loadVariablesState } from './views/variables';
import { registerVariableKeybindings } from './views/variables/keybindings-local';
import { createConfigWatcher } from './watchers/config-watcher';
import { createKeybindingsWatcher } from './watchers/keybindings-watcher';

type Providers = {
  statusBarManager: StatusBarManager;
  taskTreeDataProvider: TaskTreeDataProvider;
  variablesProvider: VariablesProvider;
  replacementsProvider: ReplacementsProvider;
};

function setupStatesAndContext(context: ExtensionContext) {
  initWorkspaceState(context);
  initGlobalState(context);
  extensionStore.initialize(context);

  const workspaceId = generateWorkspaceId();
  setWorkspaceId(workspaceId);
  void setContextKey(ContextKey.WorkspaceId, workspaceId);
  logger.info(`Workspace ID: ${workspaceId}`);
}

function setupInitialKeybindings() {
  reloadTaskKeybindings();
}

function setupProviders(workspace: string): Providers {
  const hasConfig = ConfigManager.configDirExists(workspace);
  const statusBarManager = new StatusBarManager(hasConfig);
  if (hasConfig) {
    statusBarManager.setVariables(loadVariablesState());
  }
  const taskTreeDataProvider = new TaskTreeDataProvider();
  const variablesProvider = new VariablesProvider();
  const replacementsProvider = new ReplacementsProvider();

  void VscodeHelper.fetchTasks();

  return {
    statusBarManager,
    taskTreeDataProvider,
    variablesProvider,
    replacementsProvider,
  };
}

function setupTreeViews(providers: Providers) {
  const tasksTreeView = VscodeHelper.createTreeView(getViewIdTasks(), {
    treeDataProvider: providers.taskTreeDataProvider,
    dragAndDropController: providers.taskTreeDataProvider.dragAndDropController,
  });
  providers.taskTreeDataProvider.setTreeView(tasksTreeView);

  VscodeHelper.registerTreeDataProvider(getViewIdConfigs(), providers.variablesProvider);
  VscodeHelper.registerTreeDataProvider(getViewIdReplacements(), providers.replacementsProvider);
}

function setupDisposables(context: ExtensionContext, providers: Providers) {
  context.subscriptions.push({ dispose: () => providers.statusBarManager.dispose() });
  context.subscriptions.push({ dispose: () => providers.taskTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.variablesProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.replacementsProvider.dispose() });
}

function setupWatchers(context: ExtensionContext, providers: Providers, workspace: string) {
  const configWatcher = createConfigWatcher(() => {
    logger.info('Config changed, refreshing views');
    const hasConfig = ConfigManager.configDirExists(workspace);
    providers.statusBarManager.setHasConfig(hasConfig);
    providers.statusBarManager.setVariables(hasConfig ? loadVariablesState() : {});
    providers.variablesProvider.refresh();
    providers.replacementsProvider.refresh();
    providers.taskTreeDataProvider.refresh();
  });
  context.subscriptions.push(configWatcher);

  const keybindingsWatcher = createKeybindingsWatcher(() => {
    reloadTaskKeybindings();

    providers.replacementsProvider.refresh();
    providers.variablesProvider.refresh();
    providers.taskTreeDataProvider.refresh();
  });
  context.subscriptions.push(keybindingsWatcher);

  logger.info('[extension] [setupWatchers] All watchers registered');
}

function setupCommands(context: ExtensionContext, providers: Providers) {
  const commandDisposables = registerAllCommands({
    context,
    taskTreeDataProvider: providers.taskTreeDataProvider,
    variablesProvider: providers.variablesProvider,
    replacementsProvider: providers.replacementsProvider,
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

  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) {
    logger.info('No workspace found, skipping extension initialization');
    return {};
  }

  void setContextKey(ContextKey.ExtensionInitializing, true);

  setupStatesAndContext(context);
  setupInitialKeybindings();

  const providers = setupProviders(workspace);
  setupTreeViews(providers);
  setupDisposables(context, providers);
  setupWatchers(context, providers, workspace);
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
