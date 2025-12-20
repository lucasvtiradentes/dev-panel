import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import json5 from 'json5';
import * as vscode from 'vscode';
import { Command, ContextKey, getCommandId, setContextKey } from '../../common';
import { CONFIG_DIR_NAME, DISPLAY_PREFIX } from '../../common/constants';
import { getVariableKeybinding } from './keybindings-local';
import { getIsGrouped, saveIsGrouped } from './state';

const execAsync = promisify(exec);

enum VariableKind {
  Choose = 'choose',
  Input = 'input',
  Toggle = 'toggle',
  MultiSelect = 'multi-select',
  File = 'file',
  Folder = 'folder',
}

interface VariableItem {
  name: string;
  kind: VariableKind;
  options?: string[];
  command?: string;
  icon?: string;
  description?: string;
  default?: string | boolean | string[];
  group?: string;
  showTerminal?: boolean;
}

interface PpVariables {
  variables: VariableItem[];
}

interface PpState {
  [key: string]: string | boolean | string[];
}

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function getStatePath(): string | null {
  const workspace = getWorkspacePath();
  if (!workspace) return null;
  return path.join(workspace, CONFIG_DIR_NAME, 'state.json');
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

function formatValue(value: string | boolean | string[] | undefined, variable: VariableItem): string {
  if (value === undefined) {
    if (variable.default !== undefined) {
      return formatValue(variable.default, variable);
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
    public readonly variables: VariableItem[],
  ) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'groupItem';
  }
}

export class VariableTreeItem extends vscode.TreeItem {
  constructor(
    public readonly variable: VariableItem,
    currentValue?: string | boolean | string[],
  ) {
    super(variable.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'variableItem';
    const keybinding = getVariableKeybinding(variable.name);
    const value = formatValue(currentValue, variable);
    this.description = keybinding ? `${value} • ${keybinding}` : value;
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

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, `${CONFIG_DIR_NAME}/{config.jsonc,state.json}`),
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
    const ungrouped: VariableItem[] = [];

    for (const v of config.variables) {
      if (v.group) {
        if (!grouped.has(v.group)) grouped.set(v.group, []);
        grouped.get(v.group)!.push(v);
      } else {
        ungrouped.push(v);
      }
    }

    const items: vscode.TreeItem[] = [];

    for (const [groupName, variables] of grouped) {
      items.push(new GroupTreeItem(groupName, variables));
    }

    for (const v of ungrouped) {
      items.push(new VariableTreeItem(v, state[v.name]));
    }

    return Promise.resolve(items);
  }

  private loadConfig(): PpVariables | null {
    const workspace = getWorkspacePath();
    if (!workspace) return null;

    const configPath = path.join(workspace, CONFIG_DIR_NAME, 'config.jsonc');
    if (!fs.existsSync(configPath)) return null;

    const content = fs.readFileSync(configPath, 'utf-8');
    return json5.parse(content);
  }
}

async function runCommand(variable: VariableItem, value: string | boolean | string[]): Promise<void> {
  if (!variable.command) return;

  const workspace = getWorkspacePath();
  if (!workspace) return;

  const formattedValue = Array.isArray(value) ? value.join(',') : String(value);
  const command = `${variable.command} "${formattedValue}"`;

  if (variable.showTerminal) {
    const terminal = vscode.window.createTerminal(`${DISPLAY_PREFIX} ${variable.name}`);
    terminal.show();
    terminal.sendText(`cd "${workspace}/${CONFIG_DIR_NAME}" && ${command}`);
  } else {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Running: ${variable.name}`,
        cancellable: false,
      },
      async () => {
        try {
          await execAsync(command, { cwd: `${workspace}/${CONFIG_DIR_NAME}` });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`Variable command failed: ${errorMessage}`);
        }
      },
    );
  }
}

export async function selectVariableOption(variable: VariableItem): Promise<void> {
  const state = loadState();
  let newValue: string | boolean | string[] | undefined;

  switch (variable.kind) {
    case VariableKind.Choose: {
      const selected = await vscode.window.showQuickPick(variable.options || [], {
        placeHolder: `Select ${variable.name}`,
      });
      if (!selected) return;
      newValue = selected;
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

    case VariableKind.MultiSelect: {
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
      break;
    }

    case VariableKind.File: {
      const result = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        title: variable.description || `Select file for ${variable.name}`,
      });
      if (!result || result.length === 0) return;
      newValue = result[0].fsPath;
      break;
    }

    case VariableKind.Folder: {
      const result = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: variable.description || `Select folder for ${variable.name}`,
      });
      if (!result || result.length === 0) return;
      newValue = result[0].fsPath;
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
