import * as fs from 'node:fs';
import * as path from 'node:path';
import json5 from 'json5';
import * as vscode from 'vscode';
import { Command, getCommandId } from '../../common';

type ConfigKind = 'choose' | 'input' | 'toggle' | 'multi-select' | 'file' | 'folder';

interface ConfigItem {
  name: string;
  kind: ConfigKind;
  options?: string[];
  command?: string;
  icon?: string;
  description?: string;
  default?: string | boolean | string[];
  group?: string;
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

function getIconForKind(kind: ConfigKind, customIcon?: string): vscode.ThemeIcon {
  if (customIcon) return new vscode.ThemeIcon(customIcon);
  switch (kind) {
    case 'choose':
      return new vscode.ThemeIcon('list-selection');
    case 'input':
      return new vscode.ThemeIcon('edit');
    case 'toggle':
      return new vscode.ThemeIcon('settings-gear');
    case 'multi-select':
      return new vscode.ThemeIcon('checklist');
    case 'file':
      return new vscode.ThemeIcon('file');
    case 'folder':
      return new vscode.ThemeIcon('folder');
    default:
      return new vscode.ThemeIcon('settings-gear');
  }
}

class GroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly groupName: string,
    public readonly configs: ConfigItem[],
  ) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon('folder');
    this.contextValue = 'groupItem';
  }
}

class ConfigTreeItem extends vscode.TreeItem {
  constructor(
    public readonly config: ConfigItem,
    currentValue?: string | boolean | string[],
  ) {
    super(config.name, vscode.TreeItemCollapsibleState.None);
    this.iconPath = getIconForKind(config.kind, config.icon);
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

let providerInstance: HelloView1Provider | null = null;

export class HelloView1Provider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private fileWatcher: vscode.FileSystemWatcher | null = null;

  constructor() {
    providerInstance = this;
    this.setupFileWatcher();
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
  const terminal = vscode.window.createTerminal(`BPM: ${config.name}`);
  terminal.show();
  terminal.sendText(`cd "${workspace}" && ${config.command} "${formattedValue}"`);
}

export async function selectConfigOption(config: ConfigItem): Promise<void> {
  const state = loadState();
  let newValue: string | boolean | string[] | undefined;

  switch (config.kind) {
    case 'choose': {
      const selected = await vscode.window.showQuickPick(config.options || [], {
        placeHolder: `Select ${config.name}`,
      });
      if (!selected) return;
      newValue = selected;
      break;
    }

    case 'input': {
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

    case 'toggle': {
      const currentValue = state[config.name] as boolean | undefined;
      const defaultValue = config.default as boolean | undefined;
      const current = currentValue ?? defaultValue ?? false;
      newValue = !current;
      break;
    }

    case 'multi-select': {
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

    case 'file': {
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

    case 'folder': {
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
