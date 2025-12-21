import * as fs from 'node:fs';
import * as path from 'node:path';
import json5 from 'json5';
import * as vscode from 'vscode';
import { Command, ContextKey, getCommandId, setContextKey } from '../../common';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  DISPLAY_PREFIX,
  NO_GROUP_NAME,
} from '../../common/constants';
import { applyFileReplacement, applyPatches, fileExists, isReplacementActive } from './file-ops';
import { getCurrentBranch, isGitRepository, restoreFileFromGit, setSkipWorktree } from './git-utils';
import { getReplacementKeybinding } from './keybindings-local';
import {
  addActiveReplacement,
  getActiveReplacements,
  getIsGrouped,
  getLastBranch,
  removeActiveReplacement,
  saveIsGrouped,
  setActiveReplacements,
  setLastBranch,
} from './state';
import { OnBranchChange, type PPConfig, type Replacement, ReplacementType } from './types';

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

class ReplacementGroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly groupName: string,
    public readonly replacements: Replacement[],
  ) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.REPLACEMENT_GROUP;
  }
}

class ReplacementTreeItem extends vscode.TreeItem {
  constructor(
    public readonly replacement: Replacement,
    public readonly isActive: boolean,
  ) {
    super(replacement.name, vscode.TreeItemCollapsibleState.None);

    const keybinding = getReplacementKeybinding(replacement.name);
    const status = isActive ? 'ON' : 'OFF';
    this.description = keybinding ? keybinding : '';
    this.tooltip = replacement.description || replacement.name;
    this.contextValue = CONTEXT_VALUES.REPLACEMENT_ITEM;

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
      new vscode.RelativePattern(workspace, `${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME}`),
    );

    this.configWatcher.onDidChange(() => this.refresh());
    this.configWatcher.onDidCreate(() => this.refresh());
    this.configWatcher.onDidDelete(() => this.refresh());
  }

  private async handleStartup(): Promise<void> {
    const workspace = getWorkspacePath();
    if (workspace && (await isGitRepository(workspace))) {
      const currentBranch = await getCurrentBranch(workspace);
      setLastBranch(currentBranch);
    }
    this.syncReplacementState();
  }

  private syncReplacementState(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    const config = this.loadConfig();
    if (!config?.replacements) return;

    const activeReplacements: string[] = [];
    for (const replacement of config.replacements) {
      if (isReplacementActive(workspace, replacement)) {
        activeReplacements.push(replacement.name);
      }
    }

    setActiveReplacements(activeReplacements);
  }

  async handleBranchChange(currentBranch: string): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    const lastBranch = getLastBranch();
    const activeReplacements = getActiveReplacements();

    if (lastBranch && lastBranch !== currentBranch && activeReplacements.length > 0) {
      const config = this.loadConfig();
      if (!config?.replacements) return;

      const replacementMap = new Map(config.replacements.map((r) => [r.name, r]));

      for (const name of [...activeReplacements]) {
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
      vscode.window.showInformationMessage(`${DISPLAY_PREFIX} Branch changed to ${currentBranch}`);
    }

    setLastBranch(currentBranch);
    this.syncReplacementState();
  }

  dispose(): void {
    this.configWatcher?.dispose();
    this.gitHeadWatcher?.dispose();
  }

  refresh(): void {
    this.syncReplacementState();
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

    const activeReplacements = getActiveReplacements();

    if (element instanceof ReplacementGroupTreeItem) {
      return Promise.resolve(
        element.replacements.map((r) => new ReplacementTreeItem(r, activeReplacements.includes(r.name))),
      );
    }

    if (!this._grouped) {
      return Promise.resolve(
        config.replacements.map((r) => new ReplacementTreeItem(r, activeReplacements.includes(r.name))),
      );
    }

    const grouped = new Map<string, Replacement[]>();

    for (const r of config.replacements) {
      const groupName = r.group ?? NO_GROUP_NAME;
      if (!grouped.has(groupName)) grouped.set(groupName, []);
      grouped.get(groupName)!.push(r);
    }

    const items: vscode.TreeItem[] = [];

    for (const [groupName, replacements] of grouped) {
      items.push(new ReplacementGroupTreeItem(groupName, replacements));
    }

    return Promise.resolve(items);
  }

  private loadConfig(): PPConfig | null {
    const workspace = getWorkspacePath();
    if (!workspace) return null;

    const configPath = path.join(workspace, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) return null;

    const content = fs.readFileSync(configPath, 'utf-8');
    return json5.parse(content);
  }

  async toggleReplacement(replacement: Replacement): Promise<void> {
    const activeReplacements = getActiveReplacements();
    const isActive = activeReplacements.includes(replacement.name);

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

    addActiveReplacement(replacement.name);
  }

  private async deactivateReplacement(replacement: Replacement): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    if (await isGitRepository(workspace)) {
      await setSkipWorktree(workspace, replacement.target, false);
      await restoreFileFromGit(workspace, replacement.target);
    }

    removeActiveReplacement(replacement.name);
  }

  async revertAllReplacements(): Promise<void> {
    const config = this.loadConfig();
    if (!config?.replacements) return;

    const activeReplacements = getActiveReplacements();
    const replacementMap = new Map(config.replacements.map((r) => [r.name, r]));

    for (const name of [...activeReplacements]) {
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
  vscode.window.showInformationMessage(`${DISPLAY_PREFIX} Reverted all replacements`);
}
