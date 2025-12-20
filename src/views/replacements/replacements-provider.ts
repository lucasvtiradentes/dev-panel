import * as fs from 'node:fs';
import * as path from 'node:path';
import json5 from 'json5';
import * as vscode from 'vscode';
import { Command, ContextKey, getCommandId, setContextKey } from '../../common';
import { applyFileReplacement, applyPatches, fileExists } from './file-ops';
import { getCurrentBranch, isGitRepository, restoreFileFromGit, setSkipWorktree } from './git-utils';
import { getIsGrouped, saveIsGrouped } from './state';
import { type BpmConfig, OnBranchChange, type Replacement, type ReplacementState, ReplacementType } from './types';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function getStatePath(): string | null {
  const workspace = getWorkspacePath();
  if (!workspace) return null;
  return path.join(workspace, '.bpm', 'state.json');
}

function loadFullState(): Record<string, unknown> {
  const statePath = getStatePath();
  if (!statePath || !fs.existsSync(statePath)) return {};
  const content = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(content);
}

function saveFullState(state: Record<string, unknown>): void {
  const statePath = getStatePath();
  if (!statePath) return;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function loadReplacementState(): ReplacementState {
  const state = loadFullState();
  return {
    activeReplacements: (state.activeReplacements as string[]) || [],
    lastBranch: (state.lastBranch as string) || '',
  };
}

function saveReplacementState(repState: ReplacementState): void {
  const state = loadFullState();
  state.activeReplacements = repState.activeReplacements;
  state.lastBranch = repState.lastBranch;
  saveFullState(state);
}

class ReplacementGroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly groupName: string,
    public readonly replacements: Replacement[],
  ) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'replacementGroup';
  }
}

class ReplacementTreeItem extends vscode.TreeItem {
  constructor(
    public readonly replacement: Replacement,
    public readonly isActive: boolean,
  ) {
    super(replacement.name, vscode.TreeItemCollapsibleState.None);

    this.description = isActive ? 'ON' : 'OFF';
    this.tooltip = replacement.description || replacement.name;
    this.contextValue = 'replacementItem';

    if (isActive) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
    }

    this.command = {
      command: getCommandId(Command.ToggleReplacement),
      title: 'Toggle Replacement',
      arguments: [replacement],
    };
  }
}

let providerInstance: ReplacementsProvider | null = null;

export class ReplacementsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private configWatcher: vscode.FileSystemWatcher | null = null;
  private gitHeadWatcher: vscode.FileSystemWatcher | null = null;
  private _grouped: boolean;

  constructor() {
    providerInstance = this;
    this._grouped = getIsGrouped();
    this.updateContextKeys();
    this.setupFileWatcher();
    this.setupBranchWatcher();
    this.handleStartup();
  }

  private updateContextKeys(): void {
    void setContextKey(ContextKey.ReplacementsGrouped, this._grouped);
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

    this.configWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, '.bpm/{config.jsonc,state.json}'),
    );

    this.configWatcher.onDidChange(() => this.refresh());
    this.configWatcher.onDidCreate(() => this.refresh());
    this.configWatcher.onDidDelete(() => this.refresh());
  }

  private setupBranchWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    this.gitHeadWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, '.git/HEAD'));

    this.gitHeadWatcher.onDidChange(() => this.handleBranchChange());
  }

  private async handleStartup(): Promise<void> {
    const workspace = getWorkspacePath();
    if (workspace && (await isGitRepository(workspace))) {
      const currentBranch = await getCurrentBranch(workspace);
      const newState = loadReplacementState();
      newState.lastBranch = currentBranch;
      saveReplacementState(newState);
    }
  }

  private async handleBranchChange(): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    const state = loadReplacementState();
    const currentBranch = await getCurrentBranch(workspace);

    if (state.lastBranch && state.lastBranch !== currentBranch && state.activeReplacements.length > 0) {
      const config = this.loadConfig();
      if (!config?.replacements) return;

      const replacementMap = new Map(config.replacements.map((r) => [r.name, r]));

      for (const name of [...state.activeReplacements]) {
        const replacement = replacementMap.get(name);
        if (!replacement) continue;

        const behavior = replacement.onBranchChange ?? OnBranchChange.Revert;

        if (behavior === OnBranchChange.Revert) {
          await this.deactivateReplacement(replacement);
        } else if (behavior === OnBranchChange.AutoApply) {
          await this.deactivateReplacement(replacement);
          await this.activateReplacement(replacement);
        }
      }

      this.refresh();
      vscode.window.showInformationMessage(`BPM: Branch changed to ${currentBranch}`);
    }

    state.lastBranch = currentBranch;
    saveReplacementState(state);
  }

  dispose(): void {
    this.configWatcher?.dispose();
    this.gitHeadWatcher?.dispose();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    const config = this.loadConfig();
    if (!config?.replacements || config.replacements.length === 0) {
      return Promise.resolve([]);
    }

    const state = loadReplacementState();

    if (element instanceof ReplacementGroupTreeItem) {
      return Promise.resolve(
        element.replacements.map((r) => new ReplacementTreeItem(r, state.activeReplacements.includes(r.name))),
      );
    }

    if (!this._grouped) {
      return Promise.resolve(
        config.replacements.map((r) => new ReplacementTreeItem(r, state.activeReplacements.includes(r.name))),
      );
    }

    const grouped = new Map<string, Replacement[]>();
    const ungrouped: Replacement[] = [];

    for (const r of config.replacements) {
      if (r.group) {
        if (!grouped.has(r.group)) grouped.set(r.group, []);
        grouped.get(r.group)!.push(r);
      } else {
        ungrouped.push(r);
      }
    }

    const items: vscode.TreeItem[] = [];

    for (const [groupName, replacements] of grouped) {
      items.push(new ReplacementGroupTreeItem(groupName, replacements));
    }

    for (const r of ungrouped) {
      items.push(new ReplacementTreeItem(r, state.activeReplacements.includes(r.name)));
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

  async toggleReplacement(replacement: Replacement): Promise<void> {
    const state = loadReplacementState();
    const isActive = state.activeReplacements.includes(replacement.name);

    if (isActive) {
      await this.deactivateReplacement(replacement);
    } else {
      await this.activateReplacement(replacement);
    }

    this.refresh();
  }

  private async activateReplacement(replacement: Replacement): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    if (!(await isGitRepository(workspace))) {
      vscode.window.showErrorMessage('Replacements require a git repository');
      return;
    }

    if (!fileExists(workspace, replacement.target)) {
      vscode.window.showErrorMessage(`Target file not found: ${replacement.target}`);
      return;
    }

    if (replacement.type === ReplacementType.File && !fileExists(workspace, replacement.source)) {
      vscode.window.showErrorMessage(`Source file not found: ${replacement.source}`);
      return;
    }

    await setSkipWorktree(workspace, replacement.target, true);

    if (replacement.type === ReplacementType.File) {
      applyFileReplacement(workspace, replacement.source, replacement.target);
    } else {
      applyPatches(workspace, replacement.target, replacement.patches);
    }

    const state = loadReplacementState();
    state.activeReplacements.push(replacement.name);
    saveReplacementState(state);
  }

  private async deactivateReplacement(replacement: Replacement): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    if (await isGitRepository(workspace)) {
      await setSkipWorktree(workspace, replacement.target, false);
      await restoreFileFromGit(workspace, replacement.target);
    }

    const state = loadReplacementState();
    state.activeReplacements = state.activeReplacements.filter((n) => n !== replacement.name);
    saveReplacementState(state);
  }

  async revertAllReplacements(): Promise<void> {
    const config = this.loadConfig();
    if (!config?.replacements) return;

    const state = loadReplacementState();
    const replacementMap = new Map(config.replacements.map((r) => [r.name, r]));

    for (const name of [...state.activeReplacements]) {
      const replacement = replacementMap.get(name);
      if (replacement) {
        await this.deactivateReplacement(replacement);
      }
    }

    this.refresh();
  }
}

export async function toggleReplacement(replacement: Replacement): Promise<void> {
  await providerInstance?.toggleReplacement(replacement);
}

export async function revertAllReplacements(): Promise<void> {
  await providerInstance?.revertAllReplacements();
  vscode.window.showInformationMessage('BPM: Reverted all replacements');
}
