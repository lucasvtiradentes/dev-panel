import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import {
  CONFIG_DIR_KEY,
  GLOBAL_STATE_WORKSPACE_SOURCE,
  TOOL_TASK_TYPE,
  getCommandId,
  getPromptCommandId,
  getReplacementCommandId,
  getTaskCommandId,
  getToolCommandId,
  getVariableCommandId,
  getViewIdBranchContext,
  getViewIdConfigs,
  getViewIdPrompts,
  getViewIdReplacements,
  getViewIdTasks,
  getViewIdTodos,
  getViewIdTools,
} from './common/constants';
import { getWorkspaceConfigDirPath, getWorkspaceConfigFilePath } from './common/lib/config-manager';
import { extensionStore } from './common/lib/extension-store';
import { initGlobalState, migrateGlobalState } from './common/lib/global-state';
import { syncKeybindings } from './common/lib/keybindings-sync';
import { logger } from './common/lib/logger';
import { Command, ContextKey, generateWorkspaceId, setContextKey, setWorkspaceId } from './common/lib/vscode-utils';
import { initWorkspaceState } from './common/lib/workspace-state';
import type { PPConfig } from './common/schemas';
import { StatusBarManager } from './status-bar/status-bar-manager';
import { BranchContextProvider } from './views/branch-context';
import { BranchTasksProvider } from './views/branch-tasks';
import { PromptTreeDataProvider } from './views/prompts';
import { reloadPromptKeybindings } from './views/prompts/keybindings-local';
import { ReplacementsProvider } from './views/replacements';
import { TaskTreeDataProvider } from './views/tasks';
import { reloadTaskKeybindings } from './views/tasks/keybindings-local';
import { ToolTreeDataProvider } from './views/tools';
import { reloadToolKeybindings } from './views/tools/keybindings-local';
import { VariablesProvider } from './views/variables';
import { createBranchWatcher } from './watchers/branch-watcher';
import { createConfigWatcher } from './watchers/config-watcher';
import { createKeybindingsWatcher } from './watchers/keybindings-watcher';

function registerToolKeybindings(context: vscode.ExtensionContext): void {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders || folders.length === 0) return;

  for (const folder of folders) {
    const configPath = getWorkspaceConfigFilePath(folder, 'config.jsonc');
    if (!fs.existsSync(configPath)) continue;

    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
    const tools = config.tools ?? [];

    for (const tool of tools) {
      const commandId = getToolCommandId(tool.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        const configDirPath = getWorkspaceConfigDirPath(folder);
        const shellExec = new vscode.ShellExecution(tool.command, { cwd: configDirPath });
        const task = new vscode.Task({ type: TOOL_TASK_TYPE }, folder, tool.name, TOOL_TASK_TYPE, shellExec);
        void vscode.tasks.executeTask(task);
      });
      context.subscriptions.push(disposable);
    }
  }
  syncKeybindings();
}

function registerPromptKeybindings(context: vscode.ExtensionContext): void {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders || folders.length === 0) return;

  for (const folder of folders) {
    const configPath = getWorkspaceConfigFilePath(folder, 'config.jsonc');
    if (!fs.existsSync(configPath)) continue;

    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
    const prompts = config.prompts ?? [];

    for (const prompt of prompts) {
      const commandId = getPromptCommandId(prompt.name);
      const configDirPath = getWorkspaceConfigDirPath(folder);
      const promptFilePath = `${configDirPath}/${prompt.file}`;
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void vscode.commands.executeCommand(getCommandId(Command.ExecutePrompt), promptFilePath, folder, prompt);
      });
      context.subscriptions.push(disposable);
    }
  }
  syncKeybindings();
}

function registerReplacementKeybindings(context: vscode.ExtensionContext): void {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders || folders.length === 0) return;

  for (const folder of folders) {
    const configPath = getWorkspaceConfigFilePath(folder, 'config.jsonc');
    if (!fs.existsSync(configPath)) continue;

    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
    const replacements = config.replacements ?? [];

    for (const replacement of replacements) {
      const commandId = getReplacementCommandId(replacement.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void vscode.commands.executeCommand(getCommandId(Command.ToggleReplacement), replacement);
      });
      context.subscriptions.push(disposable);
    }
  }
  syncKeybindings();
}

function registerVariableKeybindings(context: vscode.ExtensionContext): void {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders || folders.length === 0) return;

  for (const folder of folders) {
    const configPath = getWorkspaceConfigFilePath(folder, 'config.jsonc');
    if (!fs.existsSync(configPath)) continue;

    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
    const variables = config.variables ?? [];

    for (const variable of variables) {
      const commandId = getVariableCommandId(variable.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void vscode.commands.executeCommand(getCommandId(Command.SelectConfigOption), variable);
      });
      context.subscriptions.push(disposable);
    }
  }
  syncKeybindings();
}

function registerTaskKeybindings(context: vscode.ExtensionContext): void {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders || folders.length === 0) return;

  for (const folder of folders) {
    const configPath = getWorkspaceConfigFilePath(folder, 'config.jsonc');
    if (!fs.existsSync(configPath)) continue;

    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
    const tasks = config.tasks ?? [];

    for (const task of tasks) {
      const commandId = getTaskCommandId(task.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        const shellExec = new vscode.ShellExecution(task.command);
        const vsTask = new vscode.Task({ type: CONFIG_DIR_KEY }, folder, task.name, CONFIG_DIR_KEY, shellExec);
        void vscode.tasks.executeTask(vsTask);
      });
      context.subscriptions.push(disposable);
    }
  }
  syncKeybindings();
}

export function activate(context: vscode.ExtensionContext): object {
  logger.clear();
  logger.info('Better Project Tools extension activated');
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
  const promptTreeDataProvider = new PromptTreeDataProvider();
  const branchContextProvider = new BranchContextProvider();
  const branchTasksProvider = new BranchTasksProvider();

  void branchContextProvider.initialize();
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

  const branchWatcher = createBranchWatcher((newBranch) => {
    logger.info(`Branch changed to: ${newBranch}`);
    branchContextProvider.setBranch(newBranch);
    branchTasksProvider.setBranch(newBranch);
    void replacementsProvider.handleBranchChange(newBranch);
    void branchContextProvider.refreshChangedFiles();
  });
  context.subscriptions.push(branchWatcher);

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

  return {
    taskSource() {
      return context.globalState.get(GLOBAL_STATE_WORKSPACE_SOURCE);
    },
  };
}

export function deactivate(): void {}
