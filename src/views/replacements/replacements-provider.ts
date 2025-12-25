import * as fs from 'node:fs';
import * as path from 'node:path';
import json5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  ERROR_REPLACEMENTS_REQUIRE_GIT,
  ERROR_SOURCE_FILE_NOT_FOUND,
  ERROR_TARGET_FILE_NOT_FOUND,
  NO_GROUP_NAME,
  getCommandId,
} from '../../common/constants';
import { getConfigDirPattern, getConfigFilePathFromWorkspacePath } from '../../common/lib/config-manager';
import { Command, ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import type { PPConfig, PPReplacement } from '../../common/schemas/config-schema';
import { getFirstWorkspacePath } from '../../common/utils/workspace-utils';
import { applyFileReplacement, applyPatches, fileExists, isReplacementActive } from './file-ops';
import { fileExistsInGit, getCurrentBranch, isGitRepository, restoreFileFromGit, setSkipWorktree } from './git-utils';
import {
  addActiveReplacement,
  getActiveReplacements,
  getIsGrouped,
  removeActiveReplacement,
  saveIsGrouped,
  setActiveReplacements,
  setLastBranch,
} from './state';

type PatchItem = {
  search: string[];
  replace: string[];
};

function normalizePatchItem(item: { search: unknown; replace: unknown }): PatchItem {
  const normalizeValue = (value: unknown): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  };

  return {
    search: normalizeValue(item.search),
    replace: normalizeValue(item.replace),
  };
}

class ReplacementGroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly groupName: string,
    public readonly replacements: PPReplacement[],
  ) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.REPLACEMENT_GROUP;
  }
}

class ReplacementTreeItem extends vscode.TreeItem {
  constructor(
    public readonly replacement: PPReplacement,
    public readonly isActive: boolean,
  ) {
    super(replacement.name, vscode.TreeItemCollapsibleState.None);

    this.description = '';
    this.tooltip = replacement.description || replacement.name;
    this.contextValue = CONTEXT_VALUES.REPLACEMENT_ITEM;

    if (isActive) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
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
    this.updateAllActiveContext();
  }

  private updateAllActiveContext(): void {
    const config = this.loadConfig();
    if (!config?.replacements || config.replacements.length === 0) {
      void setContextKey(ContextKey.ReplacementsAllActive, false);
      return;
    }

    const activeReplacements = getActiveReplacements();
    const allActive = config.replacements.every((r) => activeReplacements.includes(r.name));
    void setContextKey(ContextKey.ReplacementsAllActive, allActive);
  }

  toggleGroupMode(): void {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(undefined);
  }

  private setupFileWatcher(): void {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const configDirPattern = getConfigDirPattern();
    this.configWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, `${configDirPattern}/${CONFIG_FILE_NAME}`),
    );

    this.configWatcher.onDidChange(() => this.refresh());
    this.configWatcher.onDidCreate(() => this.refresh());
    this.configWatcher.onDidDelete(() => this.refresh());
  }

  private async handleStartup(): Promise<void> {
    const workspace = getFirstWorkspacePath();
    if (workspace && (await isGitRepository(workspace))) {
      const currentBranch = await getCurrentBranch(workspace);
      setLastBranch(currentBranch);
    }
    this.syncReplacementState();
  }

  private syncReplacementState(): void {
    const workspace = getFirstWorkspacePath();
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
    setLastBranch(currentBranch);
    this.syncReplacementState();
  }

  dispose(): void {
    this.configWatcher?.dispose();
    this.gitHeadWatcher?.dispose();
  }

  refresh(): void {
    this.syncReplacementState();
    this.updateAllActiveContext();
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

    const grouped = new Map<string, PPReplacement[]>();

    for (const r of config.replacements) {
      const groupName = r.group ?? NO_GROUP_NAME;
      if (!grouped.has(groupName)) {
        grouped.set(groupName, []);
      }
      const group = grouped.get(groupName);
      if (group) {
        group.push(r);
      }
    }

    const items: vscode.TreeItem[] = [];

    for (const [groupName, replacements] of grouped) {
      items.push(new ReplacementGroupTreeItem(groupName, replacements));
    }

    return Promise.resolve(items);
  }

  private loadConfig(): PPConfig | null {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return null;

    const configPath = getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) return null;

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = json5.parse(content) as PPConfig;

    if (config.replacements) {
      for (const replacement of config.replacements) {
        if (replacement.type === 'patch') {
          (replacement as any).patches = replacement.patches.map(normalizePatchItem);
        }
      }
    }

    return config;
  }

  async toggleReplacement(replacement: PPReplacement): Promise<void> {
    const activeReplacements = getActiveReplacements();
    const isActive = activeReplacements.includes(replacement.name);

    if (isActive) {
      await this.deactivateReplacement(replacement);
    } else {
      await this.activateReplacement(replacement);
    }

    this.refresh();
  }

  private async activateReplacement(replacement: PPReplacement): Promise<void> {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    if (!(await isGitRepository(workspace))) {
      vscode.window.showErrorMessage(ERROR_REPLACEMENTS_REQUIRE_GIT);
      return;
    }

    if (replacement.type === 'patch' && !fileExists(workspace, replacement.target)) {
      vscode.window.showErrorMessage(`${ERROR_TARGET_FILE_NOT_FOUND}: ${replacement.target}`);
      return;
    }

    if (replacement.type === 'file' && !fileExists(workspace, replacement.source)) {
      vscode.window.showErrorMessage(`${ERROR_SOURCE_FILE_NOT_FOUND}: ${replacement.source}`);
      return;
    }

    const targetExistsInGit = await fileExistsInGit(workspace, replacement.target);
    if (targetExistsInGit) {
      await setSkipWorktree(workspace, replacement.target, true);
    }

    if (replacement.type === 'file') {
      applyFileReplacement(workspace, replacement.source, replacement.target);
    } else {
      applyPatches(workspace, replacement.target, (replacement as any).patches);
    }

    addActiveReplacement(replacement.name);
  }

  private async deactivateReplacement(replacement: PPReplacement): Promise<void> {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    if (await isGitRepository(workspace)) {
      const targetExistsInGit = await fileExistsInGit(workspace, replacement.target);

      if (targetExistsInGit) {
        await setSkipWorktree(workspace, replacement.target, false);
        await restoreFileFromGit(workspace, replacement.target);
      } else {
        const targetPath = path.join(workspace, replacement.target);
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
      }
    }

    removeActiveReplacement(replacement.name);
  }

  async toggleAllReplacements(): Promise<void> {
    const config = this.loadConfig();
    if (!config?.replacements) return;

    const activeReplacements = getActiveReplacements();
    const allActive = config.replacements.every((r) => activeReplacements.includes(r.name));

    if (allActive) {
      for (const replacement of config.replacements) {
        await this.deactivateReplacement(replacement);
      }
    } else {
      for (const replacement of config.replacements) {
        if (!activeReplacements.includes(replacement.name)) {
          await this.activateReplacement(replacement);
        }
      }
    }

    this.refresh();
  }
}

export async function toggleReplacement(replacement: PPReplacement): Promise<void> {
  await providerInstance?.toggleReplacement(replacement);
}

export async function toggleAllReplacements(): Promise<void> {
  await providerInstance?.toggleAllReplacements();
}
