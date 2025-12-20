import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import json5 from 'json5';
import * as vscode from 'vscode';
import { Command, ContextKey, getCommandId, setContextKey } from '../../common';
import { getIsGrouped, saveIsGrouped } from './state';

const execAsync = promisify(exec);

enum ConfigKind {
  Choose = 'choose',
  Input = 'input',
  Toggle = 'toggle',
  MultiSelect = 'multi-select',
  File = 'file',
  Folder = 'folder',
}

interface ConfigItem {
  name: string;
  kind: ConfigKind;
  options?: string[];
  command?: string;
  icon?: string;
  description?: string;
  default?: string | boolean | string[];
  group?: string;
  showTerminal?: boolean;
}

interface BpmConfig {
  configs: ConfigItem[];
}

interface BpmState {
  [key: string]: string | boolean | string[];
}

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function getStatePath(): string | null {
  const workspace = getWorkspacePath();
  if (!workspace) return null;
  return path.join(workspace, '.bpm', 'state.json');
}

function loadState(): BpmState {
  const statePath = getStatePath();
  if (!statePath || !fs.existsSync(statePath)) return {};
  const content = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(content);
}

function saveState(state: BpmState): void {
  const statePath = getStatePath();
  if (!statePath) return;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function formatValue(value: string | boolean | string[] | undefined, config: ConfigItem): string {
  if (value === undefined) {
    if (config.default !== undefined) {
      return formatValue(config.default, config);
    }
    return '(not set)';
  }
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '(none)';
  return value;
}

class GroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly groupName: string,
    public readonly configs: ConfigItem[],
  ) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'groupItem';
  }
}

class ConfigTreeItem extends vscode.TreeItem {
  constructor(
    public readonly config: ConfigItem,
    currentValue?: string | boolean | string[],
  ) {
    super(config.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'configItem';
    this.description = formatValue(currentValue, config);
    if (config.description) {
      this.tooltip = config.description;
    }
    this.command = {
      command: getCommandId(Command.SelectConfigOption),
      title: 'Select Option',
      arguments: [config],
    };
  }
}

let providerInstance: ConfigsProvider | null = null;

export class ConfigsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, '.bpm/{config.jsonc,state.json}'),
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
      return Promise.resolve(element.configs.map((c) => new ConfigTreeItem(c, state[c.name])));
    }

    if (!this._grouped) {
      return Promise.resolve(config.configs.map((c) => new ConfigTreeItem(c, state[c.name])));
    }

    const grouped = new Map<string, ConfigItem[]>();
    const ungrouped: ConfigItem[] = [];

    for (const c of config.configs) {
      if (c.group) {
        if (!grouped.has(c.group)) grouped.set(c.group, []);
        grouped.get(c.group)!.push(c);
      } else {
        ungrouped.push(c);
      }
    }

    const items: vscode.TreeItem[] = [];

    for (const [groupName, configs] of grouped) {
      items.push(new GroupTreeItem(groupName, configs));
    }

    for (const c of ungrouped) {
      items.push(new ConfigTreeItem(c, state[c.name]));
    }

    return Promise.resolve(items);
  }

  private loadConfig(): BpmConfig | null {
    const workspace = getWorkspacePath();
    if (!workspace) return null;

    const configPath = path.join(workspace, '.bpm', 'config.jsonc');
    if (!fs.existsSync(configPath)) return null;

    const content = fs.readFileSync(configPath, 'utf-8');
    return json5.parse(content);
  }
}

async function runCommand(config: ConfigItem, value: string | boolean | string[]): Promise<void> {
  if (!config.command) return;

  const workspace = getWorkspacePath();
  if (!workspace) return;

  const formattedValue = Array.isArray(value) ? value.join(',') : String(value);
  const command = `${config.command} "${formattedValue}"`;

  if (config.showTerminal) {
    const terminal = vscode.window.createTerminal(`BPM: ${config.name}`);
    terminal.show();
    terminal.sendText(`cd "${workspace}" && ${command}`);
  } else {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Running: ${config.name}`,
        cancellable: false,
      },
      async () => {
        try {
          await execAsync(command, { cwd: workspace });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`Config command failed: ${errorMessage}`);
        }
      },
    );
  }
}

export async function selectConfigOption(config: ConfigItem): Promise<void> {
  const state = loadState();
  let newValue: string | boolean | string[] | undefined;

  switch (config.kind) {
    case ConfigKind.Choose: {
      const selected = await vscode.window.showQuickPick(config.options || [], {
        placeHolder: `Select ${config.name}`,
      });
      if (!selected) return;
      newValue = selected;
      break;
    }

    case ConfigKind.Input: {
      const currentValue = state[config.name] as string | undefined;
      const defaultValue = config.default as string | undefined;
      const input = await vscode.window.showInputBox({
        prompt: config.description || `Enter value for ${config.name}`,
        value: currentValue || defaultValue || '',
        placeHolder: `Enter ${config.name}`,
      });
      if (input === undefined) return;
      newValue = input;
      break;
    }

    case ConfigKind.Toggle: {
      const currentValue = state[config.name] as boolean | undefined;
      const defaultValue = config.default as boolean | undefined;
      const current = currentValue ?? defaultValue ?? false;
      newValue = !current;
      break;
    }

    case ConfigKind.MultiSelect: {
      const currentValue = (state[config.name] as string[] | undefined) || [];
      const items = (config.options || []).map((opt) => ({
        label: opt,
        picked: currentValue.includes(opt),
      }));
      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: `Select ${config.name}`,
      });
      if (!selected) return;
      newValue = selected.map((s) => s.label);
      break;
    }

    case ConfigKind.File: {
      const result = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        title: config.description || `Select file for ${config.name}`,
      });
      if (!result || result.length === 0) return;
      newValue = result[0].fsPath;
      break;
    }

    case ConfigKind.Folder: {
      const result = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: config.description || `Select folder for ${config.name}`,
      });
      if (!result || result.length === 0) return;
      newValue = result[0].fsPath;
      break;
    }
  }

  if (newValue === undefined) return;

  state[config.name] = newValue;
  saveState(state);
  providerInstance?.refresh();

  await runCommand(config, newValue);
}
