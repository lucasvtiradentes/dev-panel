import * as fs from 'node:fs';
import * as path from 'node:path';
import json5 from 'json5';
import * as vscode from 'vscode';
import { getCommandId } from '../../common/constants';

interface ConfigItem {
  name: string;
  kind: 'choose';
  options: string[];
  command: string;
}

interface BpmConfig {
  configs: ConfigItem[];
}

interface BpmState {
  [key: string]: string;
}

function getStatePath(): string | null {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return null;
  return path.join(workspaceFolder.uri.fsPath, '.bpm', 'state.json');
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

class ConfigTreeItem extends vscode.TreeItem {
  constructor(
    public readonly config: ConfigItem,
    selectedValue?: string,
  ) {
    super(config.name, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('settings-gear');
    this.contextValue = 'configItem';
    this.description = selectedValue || '(not set)';
    this.command = {
      command: getCommandId('selectConfigOption'),
      title: 'Select Option',
      arguments: [config],
    };
  }
}

let providerInstance: HelloView1Provider | null = null;

export class HelloView1Provider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor() {
    providerInstance = this;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    const config = this.loadConfig();
    if (!config) {
      return Promise.resolve([]);
    }
    const state = loadState();
    return Promise.resolve(config.configs.map((c) => new ConfigTreeItem(c, state[c.name])));
  }

  private loadConfig(): BpmConfig | null {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return null;

    const configPath = path.join(workspaceFolder.uri.fsPath, '.bpm', 'config.jsonc');
    if (!fs.existsSync(configPath)) return null;

    const content = fs.readFileSync(configPath, 'utf-8');
    return json5.parse(content);
  }
}

export async function selectConfigOption(config: ConfigItem): Promise<void> {
  const selected = await vscode.window.showQuickPick(config.options, {
    placeHolder: `Select ${config.name}`,
  });

  if (!selected) return;

  const state = loadState();
  state[config.name] = selected;
  saveState(state);

  providerInstance?.refresh();

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  const terminal = vscode.window.createTerminal(`BPM: ${config.name}`);
  terminal.show();
  terminal.sendText(`cd "${workspaceFolder.uri.fsPath}" && ${config.command} "${selected}"`);
}
