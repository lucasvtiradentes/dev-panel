import { registerAllCommands } from './commands/register-all';
import {
  GLOBAL_STATE_WORKSPACE_SOURCE,
  getViewIdBranchContext,
  getViewIdChangedFiles,
  getViewIdConfigs,
  getViewIdPrompts,
  getViewIdReplacements,
  getViewIdTasks,
  getViewIdTodos,
  getViewIdTools,
} from './common/constants';
import { ConfigManager } from './common/core/config-manager';
import { extensionStore } from './common/core/extension-store';
import { logger } from './common/lib/logger';
import { initGlobalState, initWorkspaceState } from './common/state';
import { ContextKey, setContextKey } from './common/vscode/vscode-context';
import { VscodeHelper } from './common/vscode/vscode-helper';
import type { ExtensionContext } from './common/vscode/vscode-types';
import { generateWorkspaceId, setWorkspaceId } from './common/vscode/vscode-workspace';
import {
  SyncEvent,
  createBranchMarkdownWatcher,
  createBranchWatcher,
  createGitStatusWatcher,
  createRootMarkdownWatcher,
  createTemplateWatcher,
  disposeSyncCoordinator,
  getSyncCoordinator,
} from './features/branch-context-sync';
import { StatusBarManager } from './status-bar/status-bar-manager';
import { BranchChangedFilesProvider } from './views/branch-changed-files';
import { BranchContextProvider } from './views/branch-context';
import { BranchTasksProvider } from './views/branch-tasks';
import { PromptTreeDataProvider } from './views/prompts';
import { registerPromptKeybindings, reloadPromptKeybindings } from './views/prompts/keybindings-local';
import { ReplacementsProvider } from './views/replacements';
import { registerReplacementKeybindings } from './views/replacements/keybindings-local';
import { TaskTreeDataProvider } from './views/tasks';
import { registerTaskKeybindings, reloadTaskKeybindings } from './views/tasks/keybindings-local';
import { ToolTreeDataProvider, setToolProviderInstance } from './views/tools';
import { registerToolKeybindings, reloadToolKeybindings } from './views/tools/keybindings-local';
import { VariablesProvider, loadVariablesState } from './views/variables';
import { registerVariableKeybindings } from './views/variables/keybindings-local';
import { createConfigWatcher } from './watchers/config-watcher';
import { createKeybindingsWatcher } from './watchers/keybindings-watcher';

type Providers = {
  statusBarManager: StatusBarManager;
  taskTreeDataProvider: TaskTreeDataProvider;
  variablesProvider: VariablesProvider;
  replacementsProvider: ReplacementsProvider;
  toolTreeDataProvider: ToolTreeDataProvider;
  promptTreeDataProvider: PromptTreeDataProvider;
  branchContextProvider: BranchContextProvider;
  branchTasksProvider: BranchTasksProvider;
  branchChangedFilesProvider: BranchChangedFilesProvider;
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
  reloadToolKeybindings();
  reloadPromptKeybindings();
  reloadTaskKeybindings();
}

function setupProviders(activateStart: number, workspace: string): Providers {
  const hasConfig = ConfigManager.configDirExists(workspace);
  const statusBarManager = new StatusBarManager(hasConfig);
  if (hasConfig) {
    statusBarManager.setVariables(loadVariablesState());
  }
  const taskTreeDataProvider = new TaskTreeDataProvider();
  const variablesProvider = new VariablesProvider();
  const replacementsProvider = new ReplacementsProvider();
  const promptTreeDataProvider = new PromptTreeDataProvider();
  const branchTasksProvider = new BranchTasksProvider();
  const branchChangedFilesProvider = new BranchChangedFilesProvider();
  const branchContextProvider = new BranchContextProvider(() => {
    branchTasksProvider.refreshIfNeeded();
    branchChangedFilesProvider.refreshIfNeeded();
  });
  branchChangedFilesProvider.setSyncCallback((comparisonBranch) =>
    branchContextProvider.syncBranchContext(comparisonBranch),
  );
  const toolTreeDataProvider = new ToolTreeDataProvider();
  setToolProviderInstance(toolTreeDataProvider);

  logger.info(`[activate] Calling branchContextProvider.initialize (+${Date.now() - activateStart}ms)`);
  void branchContextProvider.initialize();
  void VscodeHelper.fetchTasks();

  return {
    statusBarManager,
    taskTreeDataProvider,
    variablesProvider,
    replacementsProvider,
    toolTreeDataProvider,
    promptTreeDataProvider,
    branchContextProvider,
    branchTasksProvider,
    branchChangedFilesProvider,
  };
}

function setupTreeViews(providers: Providers) {
  const tasksTreeView = VscodeHelper.createTreeView(getViewIdTasks(), {
    treeDataProvider: providers.taskTreeDataProvider,
    dragAndDropController: providers.taskTreeDataProvider.dragAndDropController,
  });
  providers.taskTreeDataProvider.setTreeView(tasksTreeView);

  const toolsTreeView = VscodeHelper.createTreeView(getViewIdTools(), {
    treeDataProvider: providers.toolTreeDataProvider,
    dragAndDropController: providers.toolTreeDataProvider.dragAndDropController,
  });
  providers.toolTreeDataProvider.setTreeView(toolsTreeView);

  const promptsTreeView = VscodeHelper.createTreeView(getViewIdPrompts(), {
    treeDataProvider: providers.promptTreeDataProvider,
    dragAndDropController: providers.promptTreeDataProvider.dragAndDropController,
  });
  providers.promptTreeDataProvider.setTreeView(promptsTreeView);

  const branchContextTreeView = VscodeHelper.createTreeView(getViewIdBranchContext(), {
    treeDataProvider: providers.branchContextProvider,
  });
  providers.branchContextProvider.setTreeView(branchContextTreeView);

  const branchTasksTreeView = VscodeHelper.createTreeView(getViewIdTodos(), {
    treeDataProvider: providers.branchTasksProvider,
    dragAndDropController: providers.branchTasksProvider.dragAndDropController,
  });
  providers.branchTasksProvider.setTreeView(branchTasksTreeView);

  const changedFilesTreeView = VscodeHelper.createTreeView(getViewIdChangedFiles(), {
    treeDataProvider: providers.branchChangedFilesProvider,
  });
  providers.branchChangedFilesProvider.setTreeView(changedFilesTreeView);

  VscodeHelper.registerTreeDataProvider(getViewIdConfigs(), providers.variablesProvider);
  VscodeHelper.registerTreeDataProvider(getViewIdReplacements(), providers.replacementsProvider);
}

function setupDisposables(context: ExtensionContext, providers: Providers) {
  context.subscriptions.push({ dispose: () => providers.statusBarManager.dispose() });
  context.subscriptions.push({ dispose: () => providers.taskTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.variablesProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.replacementsProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.toolTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.promptTreeDataProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.branchContextProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.branchTasksProvider.dispose() });
  context.subscriptions.push({ dispose: () => providers.branchChangedFilesProvider.dispose() });
  context.subscriptions.push({ dispose: () => disposeSyncCoordinator() });
}

function setupSyncCoordinatorEvents(providers: Providers) {
  const coordinator = getSyncCoordinator();

  coordinator.on(SyncEvent.BranchChanged, (data) => {
    logger.info(`[SyncCoordinator] Branch changed to: ${data.branch}`);

    providers.branchContextProvider.setBranch(data.branch, false);
    providers.branchTasksProvider.setBranch(data.branch);
    providers.branchChangedFilesProvider.setBranch(data.branch);

    void Promise.all([
      providers.replacementsProvider.handleBranchChange(data.branch),
      providers.branchContextProvider.syncBranchContext(providers.branchChangedFilesProvider.getComparisonBranch()),
    ]);
  });

  coordinator.on(SyncEvent.FileChanged, (data) => {
    logger.info(`[SyncCoordinator] File changed: ${data.filePath}`);
    const uri = VscodeHelper.createFileUri(data.filePath);
    providers.branchContextProvider.handleMarkdownChange(uri);
    providers.branchTasksProvider.handleMarkdownChange(uri);
    providers.branchChangedFilesProvider.handleMarkdownChange(uri);
  });

  coordinator.on(SyncEvent.RootMarkdownChanged, () => {
    logger.info('[SyncCoordinator] Root markdown changed');
    providers.branchContextProvider.handleRootMarkdownChange();
  });

  coordinator.on(SyncEvent.TemplateChanged, () => {
    logger.info('[SyncCoordinator] Template changed');
    providers.branchContextProvider.handleTemplateChange();
  });

  coordinator.on(SyncEvent.GitStatusChanged, () => {
    logger.info('[SyncCoordinator] Git status changed');
    void providers.branchChangedFilesProvider.syncChangedFiles();
  });
}

function setupWatchers(context: ExtensionContext, providers: Providers, activateStart: number, workspace: string) {
  const configWatcher = createConfigWatcher(() => {
    logger.info('Config changed, refreshing views');
    const hasConfig = ConfigManager.configDirExists(workspace);
    providers.statusBarManager.setHasConfig(hasConfig);
    providers.statusBarManager.setVariables(hasConfig ? loadVariablesState() : {});
    providers.variablesProvider.refresh();
    providers.replacementsProvider.refresh();
    providers.toolTreeDataProvider.refresh();
    providers.promptTreeDataProvider.refresh();
    providers.taskTreeDataProvider.refresh();
    providers.branchTasksProvider.refresh();
    providers.branchContextProvider.refresh();
  });
  context.subscriptions.push(configWatcher);

  const keybindingsWatcher = createKeybindingsWatcher(() => {
    reloadToolKeybindings();
    reloadPromptKeybindings();
    reloadTaskKeybindings();

    providers.toolTreeDataProvider.refresh();
    providers.promptTreeDataProvider.refresh();
    providers.replacementsProvider.refresh();
    providers.variablesProvider.refresh();
    providers.taskTreeDataProvider.refresh();
  });
  context.subscriptions.push(keybindingsWatcher);

  logger.info(`[activate] Creating watchers (+${Date.now() - activateStart}ms)`);

  const branchMarkdownWatcher = createBranchMarkdownWatcher();
  context.subscriptions.push(branchMarkdownWatcher);

  const branchWatcher = createBranchWatcher();
  context.subscriptions.push(branchWatcher);

  const coordinator = getSyncCoordinator();
  coordinator.on(SyncEvent.BranchChanged, (data) => {
    branchMarkdownWatcher.updateWatcher(data.branch);
  });

  logger.info(`[activate] branchWatcher created (+${Date.now() - activateStart}ms)`);

  const rootMarkdownWatcher = createRootMarkdownWatcher();
  context.subscriptions.push(rootMarkdownWatcher);

  const templateWatcher = createTemplateWatcher();
  context.subscriptions.push(templateWatcher);

  const gitStatusWatcher = createGitStatusWatcher();
  context.subscriptions.push(gitStatusWatcher);

  logger.info('[extension] [setupWatchers] All watchers registered');
}

function setupCommands(context: ExtensionContext, providers: Providers) {
  const commandDisposables = registerAllCommands({
    context,
    taskTreeDataProvider: providers.taskTreeDataProvider,
    toolTreeDataProvider: providers.toolTreeDataProvider,
    promptTreeDataProvider: providers.promptTreeDataProvider,
    variablesProvider: providers.variablesProvider,
    replacementsProvider: providers.replacementsProvider,
    branchContextProvider: providers.branchContextProvider,
    branchTasksProvider: providers.branchTasksProvider,
    branchChangedFilesProvider: providers.branchChangedFilesProvider,
  });
  context.subscriptions.push(...commandDisposables);

  registerToolKeybindings(context);
  registerPromptKeybindings(context);
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

  const providers = setupProviders(activateStart, workspace);
  setupTreeViews(providers);
  setupDisposables(context, providers);
  setupSyncCoordinatorEvents(providers);
  setupWatchers(context, providers, activateStart, workspace);
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
