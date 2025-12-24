import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import { promisify } from 'node:util';
import json5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  DEFAULT_EXCLUDES,
  DEFAULT_INCLUDES,
  DESCRIPTION_NOT_SET,
  DISPLAY_PREFIX,
  ERROR_VARIABLE_COMMAND_FAILED,
  NO_GROUP_NAME,
  VARIABLES_FILE_NAME,
  getCommandId,
} from '../../common/constants';
import {
  getConfigDirPathFromWorkspacePath,
  getConfigDirPattern,
  getConfigFilePathFromWorkspacePath,
} from '../../common/lib/config-manager';
import { type FileSelectionOptions, selectFiles, selectFolders } from '../../common/lib/file-selection';
import { Command, ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import type { PPSettings } from '../../common/schemas';
import { getIsGrouped, saveIsGrouped } from './state';

const execAsync = promisify(exec);

enum VariableKind {
  Choose = 'choose',
  Input = 'input',
  Toggle = 'toggle',
  File = 'file',
  Folder = 'folder',
}

type VariableItem = {
  name: string;
  kind: VariableKind;
  options?: string[];
  command?: string;
  description?: string;
  default?: unknown;
  group?: string;
  showTerminal?: boolean;
  multiSelect?: boolean;
  includes?: string[];
  excludes?: string[];
};

type PpVariables = {
  variables: VariableItem[];
};

type PpState = {
  [key: string]: unknown;
};

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function getStatePath(): string | null {
  const workspace = getWorkspacePath();
  if (!workspace) return null;
  return getConfigFilePathFromWorkspacePath(workspace, VARIABLES_FILE_NAME);
}

function loadState(): PpState {
  const statePath = getStatePath();
  if (!statePath || !fs.existsSync(statePath)) return {};
  const content = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(content);
}

function saveState(state: PpState): void {
  const statePath = getStatePath();
  if (!statePath) return;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function formatValue(value: unknown, variable: VariableItem): string {
  if (value === undefined) {
    if (variable.default !== undefined) {
      return formatValue(variable.default, variable);
    }
    return DESCRIPTION_NOT_SET;
  }
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '(none)';
  return String(value);
}

class GroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly groupName: string,
    public readonly variables: VariableItem[],
  ) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.GROUP_ITEM;
  }
}

export class VariableTreeItem extends vscode.TreeItem {
  constructor(
    public readonly variable: VariableItem,
    currentValue?: unknown,
  ) {
    super(variable.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = CONTEXT_VALUES.VARIABLE_ITEM;
    const value = formatValue(currentValue, variable);
    this.description = value;
    if (variable.description) {
      this.tooltip = variable.description;
    }
    this.command = {
      command: getCommandId(Command.SelectConfigOption),
      title: 'Select Option',
      arguments: [variable],
    };
  }
}

let providerInstance: VariablesProvider | null = null;

export class VariablesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private _grouped: boolean;

  constructor() {
    providerInstance = this;
    this._grouped = getIsGrouped();
    this.updateContextKeys();
    this.setupFileWatcher();
  }

  private updateContextKeys(): void {
    void setContextKey(ContextKey.ConfigsGrouped, this._grouped);
  }

  toggleGroupMode(): void {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(undefined);
  }

  private setupFileWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    const configDirPattern = getConfigDirPattern();
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, `${configDirPattern}/{${CONFIG_FILE_NAME},${VARIABLES_FILE_NAME}}`),
    );

    this.fileWatcher.onDidChange(() => this.refresh());
    this.fileWatcher.onDidCreate(() => this.refresh());
    this.fileWatcher.onDidDelete(() => this.refresh());
  }

  dispose(): void {
    this.fileWatcher?.dispose();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    const config = this.loadConfig();
    if (!config) return Promise.resolve([]);

    const state = loadState();

    if (element instanceof GroupTreeItem) {
      return Promise.resolve(element.variables.map((v) => new VariableTreeItem(v, state[v.name])));
    }

    if (!this._grouped) {
      return Promise.resolve(config.variables.map((v) => new VariableTreeItem(v, state[v.name])));
    }

    const grouped = new Map<string, VariableItem[]>();

    for (const v of config.variables) {
      const groupName = v.group ?? NO_GROUP_NAME;
      if (!grouped.has(groupName)) {
        grouped.set(groupName, []);
      }
      const group = grouped.get(groupName);
      if (group) {
        group.push(v);
      }
    }

    const items: vscode.TreeItem[] = [];

    for (const [groupName, variables] of grouped) {
      items.push(new GroupTreeItem(groupName, variables));
    }

    return Promise.resolve(items);
  }

  private loadConfig(): PpVariables | null {
    const workspace = getWorkspacePath();
    if (!workspace) return null;

    const configPath = getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) return null;

    const content = fs.readFileSync(configPath, 'utf-8');
    return json5.parse(content);
  }

  public loadSettings(): PPSettings | undefined {
    const workspace = getWorkspacePath();
    if (!workspace) return undefined;

    const configPath = getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) return undefined;

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = json5.parse(content);
    return config.settings;
  }
}

async function runCommand(variable: VariableItem, value: unknown): Promise<void> {
  if (!variable.command) return;

  const workspace = getWorkspacePath();
  if (!workspace) return;

  const formattedValue = Array.isArray(value) ? value.join(',') : String(value);
  const command = `${variable.command} "${formattedValue}"`;
  const configDirPath = getConfigDirPathFromWorkspacePath(workspace);

  if (variable.showTerminal) {
    const terminal = vscode.window.createTerminal(`${DISPLAY_PREFIX} ${variable.name}`);
    terminal.show();
    terminal.sendText(`cd "${configDirPath}" && ${command}`);
  } else {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Running: ${variable.name}`,
        cancellable: false,
      },
      async () => {
        try {
          await execAsync(command, { cwd: configDirPath });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`${ERROR_VARIABLE_COMMAND_FAILED}: ${errorMessage}`);
        }
      },
    );
  }
}

export async function selectVariableOption(variable: VariableItem): Promise<void> {
  const state = loadState();
  let newValue: unknown;

  switch (variable.kind) {
    case VariableKind.Choose: {
      if (variable.multiSelect) {
        const currentValue = (state[variable.name] as string[] | undefined) || [];
        const items = (variable.options || []).map((opt) => ({
          label: opt,
          picked: currentValue.includes(opt),
        }));
        const selected = await vscode.window.showQuickPick(items, {
          canPickMany: true,
          placeHolder: `Select ${variable.name}`,
        });
        if (!selected) return;
        newValue = selected.map((s) => s.label);
      } else {
        const selected = await vscode.window.showQuickPick(variable.options || [], {
          placeHolder: `Select ${variable.name}`,
        });
        if (!selected) return;
        newValue = selected;
      }
      break;
    }

    case VariableKind.Input: {
      const currentValue = state[variable.name] as string | undefined;
      const defaultValue = variable.default as string | undefined;
      const input = await vscode.window.showInputBox({
        prompt: variable.description || `Enter value for ${variable.name}`,
        value: currentValue || defaultValue || '',
        placeHolder: `Enter ${variable.name}`,
      });
      if (input === undefined) return;
      newValue = input;
      break;
    }

    case VariableKind.Toggle: {
      const currentValue = state[variable.name] as boolean | undefined;
      const defaultValue = variable.default as boolean | undefined;
      const current = currentValue ?? defaultValue ?? false;
      newValue = !current;
      break;
    }

    case VariableKind.File: {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;

      const settings = providerInstance?.loadSettings();

      const defaultIncludes = [...DEFAULT_INCLUDES];
      const includes =
        variable.includes && variable.includes.length > 0
          ? [...defaultIncludes, ...variable.includes]
          : settings?.include && settings.include.length > 0
            ? [...defaultIncludes, ...settings.include]
            : defaultIncludes;

      const defaultExcludes = [...DEFAULT_EXCLUDES];
      const excludes =
        variable.excludes && variable.excludes.length > 0
          ? [...defaultExcludes, ...variable.excludes]
          : settings?.exclude && settings.exclude.length > 0
            ? [...defaultExcludes, ...settings.exclude]
            : defaultExcludes;

      const options: FileSelectionOptions = {
        label: variable.description || `Select file for ${variable.name}`,
        multiSelect: variable.multiSelect ?? false,
        includes,
        excludes,
      };

      const result = await selectFiles(workspaceFolder, options);
      if (!result) return;
      newValue = result;
      break;
    }

    case VariableKind.Folder: {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;

      const settings = providerInstance?.loadSettings();

      const defaultIncludes = [...DEFAULT_INCLUDES];
      const includes =
        variable.includes && variable.includes.length > 0
          ? [...defaultIncludes, ...variable.includes]
          : settings?.include && settings.include.length > 0
            ? [...defaultIncludes, ...settings.include]
            : defaultIncludes;

      const defaultExcludes = [...DEFAULT_EXCLUDES];
      const excludes =
        variable.excludes && variable.excludes.length > 0
          ? [...defaultExcludes, ...variable.excludes]
          : settings?.exclude && settings.exclude.length > 0
            ? [...defaultExcludes, ...settings.exclude]
            : defaultExcludes;

      const options: FileSelectionOptions = {
        label: variable.description || `Select folder for ${variable.name}`,
        multiSelect: variable.multiSelect ?? false,
        includes,
        excludes,
      };

      const result = await selectFolders(workspaceFolder, options);
      if (!result) return;
      newValue = result;
      break;
    }
  }

  if (newValue === undefined) return;

  state[variable.name] = newValue;
  saveState(state);
  providerInstance?.refresh();

  await runCommand(variable, newValue);
}

export function resetVariableOption(item: VariableTreeItem): void {
  const state = loadState();
  delete state[item.variable.name];
  saveState(state);
  providerInstance?.refresh();
}
