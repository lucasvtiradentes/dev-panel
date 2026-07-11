import { getActionCommandId, getCommandId } from '../common/constants';
import { createLogger } from '../common/lib/logger';
import { type GlobalAction, GlobalActionsConfigSchema } from '../common/schemas/config-schema';
import { executeTaskSilently } from '../common/utils/functions/execute-silent';
import { readJsoncFile } from '../common/utils/functions/read-jsonc-file';
import { FileIOHelper, NodeOsHelper, NodePathHelper } from '../common/utils/helpers/node-helper';
import { Command, executeCommand, registerDynamicCommand } from '../common/vscode/vscode-commands';
import { VscodeConstants } from '../common/vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../common/vscode/vscode-helper';
import { collectInputs, replaceInputPlaceholders } from '../common/vscode/vscode-inputs';
import type { Disposable, ExtensionContext, QuickPickItem, StatusBarItem } from '../common/vscode/vscode-types';
import { attachFileWatcherHandlers } from '../common/vscode/vscode-watcher';
import { ExtensionConfigKey, getExtensionConfig } from '../common/vscode/vscode-workspace';

const logger = createLogger('actions');
const WORKSPACE_PLACEHOLDER = /\$\{workspaceFolder\}/g;
const USER_HOME_PLACEHOLDER = /\$\{userHome\}/g;

type ActionQuickPickItem = QuickPickItem & { action: GlobalAction };

export class GlobalActionsManager implements Disposable {
  private readonly statusBarItem: StatusBarItem;
  private actionCommandDisposables: Disposable[] = [];
  private configWatcher: Disposable | null = null;
  private actions: GlobalAction[] = [];
  private configError: string | null = null;

  constructor(private readonly context: ExtensionContext) {
    this.statusBarItem = VscodeHelper.createStatusBarItem(VscodeConstants.StatusBarAlignment.Right, 99);
    this.statusBarItem.text = '$(globe) Actions';
    this.statusBarItem.tooltip = 'Run a global Dev Panel action';
    this.statusBarItem.command = getCommandId(Command.ShowGlobalActions);
    this.statusBarItem.show();
    this.reload();
  }

  reload() {
    this.disposeRuntimeResources();
    const config = this.loadConfig();
    this.actions = config.actions;
    this.configError = config.error;
    this.registerActionCommands();
    this.createConfigWatcher();
  }

  async showActions() {
    const configPath = getExtensionConfig(ExtensionConfigKey.GlobalActionsConfigPath);
    if (!configPath) {
      await executeCommand(Command.ConfigureGlobalActions);
      return;
    }

    if (this.configError) {
      void VscodeHelper.showToastMessage(ToastKind.Error, this.configError);
      return;
    }

    if (this.actions.length === 0) {
      void VscodeHelper.showToastMessage(ToastKind.Warning, 'No global actions found');
      return;
    }

    const selected = await VscodeHelper.showQuickPickItems<ActionQuickPickItem>(
      this.actions.map((action) => ({ label: action.name, description: action.description, action })),
      { placeHolder: 'Select a global action', ignoreFocusOut: true },
    );
    if (selected) await this.execute(selected.action);
  }

  async execute(action: GlobalAction) {
    const workspaceFolder = VscodeHelper.getActiveWorkspaceFolder() ?? null;
    const workspacePath = workspaceFolder?.uri.fsPath;
    const cwd = this.resolveCwd(action.cwd, workspacePath);
    if (!cwd) {
      void VscodeHelper.showToastMessage(ToastKind.Error, `Action "${action.name}" requires a workspace or cwd`);
      return;
    }

    const inputValues = action.inputs ? await collectInputs(action.inputs, workspaceFolder) : {};
    if (inputValues === null) return;

    const commandWithInputs = replaceInputPlaceholders(action.command, inputValues);
    const command = this.resolvePlaceholders(commandWithInputs, workspacePath);
    logger.info(`Executing global action: ${action.name}`);
    await executeTaskSilently({
      command,
      cwd,
      env: {},
      taskName: action.name,
      customNotification: action.customNotification,
      itemKind: 'Action',
    });
  }

  dispose() {
    this.disposeRuntimeResources();
    this.statusBarItem.dispose();
  }

  private loadConfig(): { actions: GlobalAction[]; error: string | null } {
    const configPath = getExtensionConfig(ExtensionConfigKey.GlobalActionsConfigPath);
    if (!configPath) return { actions: [], error: null };

    try {
      const config = GlobalActionsConfigSchema.parse(readJsoncFile(FileIOHelper.readFile(configPath)));
      return { actions: config.actions, error: null };
    } catch (error) {
      logger.error(`Failed to load global actions config: ${String(error)}`);
      return { actions: [], error: 'Global Actions config is invalid or unavailable' };
    }
  }

  private registerActionCommands() {
    this.actionCommandDisposables = this.actions.map((action) => {
      const disposable = registerDynamicCommand(getActionCommandId(action.name), () => this.execute(action));
      this.context.subscriptions.push(disposable);
      return disposable;
    });
  }

  private createConfigWatcher() {
    const configPath = getExtensionConfig(ExtensionConfigKey.GlobalActionsConfigPath);
    if (!configPath) return;

    const pattern = VscodeHelper.createRelativePattern(
      NodePathHelper.dirname(configPath),
      NodePathHelper.basename(configPath),
    );
    const watcher = VscodeHelper.createFileSystemWatcher(pattern);
    const reload = () => this.reload();
    attachFileWatcherHandlers(watcher, { onChange: reload, onCreate: reload, onDelete: reload });
    this.configWatcher = watcher;
  }

  private resolveCwd(configuredCwd: string | undefined, workspacePath: string | undefined): string | null {
    if (!configuredCwd) return workspacePath ?? null;
    const resolved = this.resolvePlaceholders(configuredCwd, workspacePath);
    if (NodePathHelper.isAbsolute(resolved)) return resolved;
    return workspacePath ? NodePathHelper.resolve(workspacePath, resolved) : null;
  }

  private resolvePlaceholders(value: string, workspacePath: string | undefined): string {
    const withHome = value.replace(USER_HOME_PLACEHOLDER, NodeOsHelper.homedir());
    return workspacePath ? withHome.replace(WORKSPACE_PLACEHOLDER, workspacePath) : withHome;
  }

  private disposeRuntimeResources() {
    for (const disposable of this.actionCommandDisposables) disposable.dispose();
    this.actionCommandDisposables = [];
    this.configWatcher?.dispose();
    this.configWatcher = null;
  }
}
