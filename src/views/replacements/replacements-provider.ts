import json5 from 'json5';
import {
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  ERROR_REPLACEMENTS_REQUIRE_GIT,
  ERROR_SOURCE_FILE_NOT_FOUND,
  ERROR_TARGET_FILE_NOT_FOUND,
  NO_GROUP_NAME,
  getCommandId,
} from '../../common/constants';
import { GitHelper } from '../../common/lib/git-helper';
import { FileIOHelper, NodePathHelper } from '../../common/lib/node-helper';
import type { DevPanelConfig, DevPanelReplacement, NormalizedPatchItem } from '../../common/schemas';
import { DevPanelConfigSchema } from '../../common/schemas/config-schema';
import { ConfigManager } from '../../common/utils/config-manager';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import { type TreeDataProvider, type TreeItem, TreeItemClass } from '../../common/vscode/vscode-types';
import { Command, ContextKey, setContextKey } from '../../common/vscode/vscode-utils';
import { getFirstWorkspacePath } from '../../common/vscode/workspace-utils';
import { applyFileReplacement, applyPatches, fileExists, isReplacementActive } from './file-ops';
import {
  addActiveReplacement,
  getActiveReplacements,
  getIsGrouped,
  removeActiveReplacement,
  saveIsGrouped,
  setActiveReplacements,
  setLastBranch,
} from './state';

type NormalizedPatchReplacement = {
  type: 'patch';
  name: string;
  target: string;
  description?: string;
  group?: string;
  patches: NormalizedPatchItem[];
};

function normalizePatchItem(item: { search: unknown; replace: unknown }): NormalizedPatchItem {
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

class ReplacementGroupTreeItem extends TreeItemClass {
  constructor(
    public readonly groupName: string,
    public readonly replacements: DevPanelReplacement[],
  ) {
    super(groupName, VscodeConstants.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.REPLACEMENT_GROUP;
  }
}

class ReplacementTreeItem extends TreeItemClass {
  constructor(
    public readonly replacement: DevPanelReplacement,
    public readonly isActive: boolean,
  ) {
    super(replacement.name, VscodeConstants.TreeItemCollapsibleState.None);

    this.description = '';
    this.tooltip = replacement.description || replacement.name;
    this.contextValue = CONTEXT_VALUES.REPLACEMENT_ITEM;

    if (isActive) {
      this.iconPath = VscodeIcons.ActiveItem;
    }

    this.command = {
      command: getCommandId(Command.ToggleReplacement),
      title: 'Toggle Replacement',
      arguments: [replacement],
    };
  }
}

let providerInstance: ReplacementsProvider | null = null;

export class ReplacementsProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = VscodeHelper.createEventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _grouped: boolean;

  constructor() {
    providerInstance = this;
    this._grouped = getIsGrouped();
    this.updateContextKeys();
    this.handleStartup();
  }

  private updateContextKeys() {
    void setContextKey(ContextKey.ReplacementsGrouped, this._grouped);
    this.updateAllActiveContext();
  }

  private updateAllActiveContext() {
    const config = this.loadConfig();
    if (!config?.replacements || config.replacements.length === 0) {
      void setContextKey(ContextKey.ReplacementsAllActive, false);
      return;
    }

    const activeReplacements = getActiveReplacements();
    const allActive = config.replacements.every((r) => activeReplacements.includes(r.name));
    void setContextKey(ContextKey.ReplacementsAllActive, allActive);
  }

  toggleGroupMode() {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(undefined);
  }

  private async handleStartup() {
    const workspace = getFirstWorkspacePath();
    if (workspace && (await GitHelper.isRepository(workspace))) {
      const currentBranch = await GitHelper.getCurrentBranch(workspace);
      setLastBranch(currentBranch);
    }
    this.syncReplacementState();
  }

  private syncReplacementState() {
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

  handleBranchChange(currentBranch: string) {
    setLastBranch(currentBranch);
    this.syncReplacementState();
  }

  // tscanner-ignore-next-line no-empty-function
  dispose() {}

  refresh() {
    this.syncReplacementState();
    this.updateAllActiveContext();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
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

    const grouped = new Map<string, DevPanelReplacement[]>();

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

    const items: TreeItem[] = [];

    for (const [groupName, replacements] of grouped) {
      items.push(new ReplacementGroupTreeItem(groupName, replacements));
    }

    return Promise.resolve(items);
  }

  private loadConfig(): DevPanelConfig | null {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return null;

    const configPath = ConfigManager.getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!FileIOHelper.fileExists(configPath)) return null;

    const content = FileIOHelper.readFile(configPath);
    const rawConfig = json5.parse(content);
    const config = DevPanelConfigSchema.parse(rawConfig);

    if (config.replacements) {
      for (const replacement of config.replacements) {
        if (replacement.type === 'patch') {
          (replacement as unknown as NormalizedPatchReplacement).patches = replacement.patches.map(normalizePatchItem);
        }
      }
    }

    return config;
  }

  async toggleReplacement(replacement: DevPanelReplacement) {
    const activeReplacements = getActiveReplacements();
    const isActive = activeReplacements.includes(replacement.name);

    if (isActive) {
      await this.deactivateReplacement(replacement);
    } else {
      await this.activateReplacement(replacement);
    }

    this.refresh();
  }

  private async activateReplacement(replacement: DevPanelReplacement) {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    if (!(await GitHelper.isRepository(workspace))) {
      VscodeHelper.showToastMessage(ToastKind.Error, ERROR_REPLACEMENTS_REQUIRE_GIT);
      return;
    }

    if (replacement.type === 'patch' && !fileExists(workspace, replacement.target)) {
      VscodeHelper.showToastMessage(ToastKind.Error, `${ERROR_TARGET_FILE_NOT_FOUND}: ${replacement.target}`);
      return;
    }

    if (replacement.type === 'file' && !fileExists(workspace, replacement.source)) {
      VscodeHelper.showToastMessage(ToastKind.Error, `${ERROR_SOURCE_FILE_NOT_FOUND}: ${replacement.source}`);
      return;
    }

    const targetExistsInGit = await GitHelper.fileExistsInGit(workspace, replacement.target);
    if (targetExistsInGit) {
      await GitHelper.setSkipWorktree(workspace, replacement.target, true);
    }

    if (replacement.type === 'file') {
      applyFileReplacement(workspace, replacement.source, replacement.target);
    } else {
      applyPatches(workspace, replacement.target, (replacement as unknown as NormalizedPatchReplacement).patches);
    }

    addActiveReplacement(replacement.name);
  }

  private async deactivateReplacement(replacement: DevPanelReplacement) {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    if (await GitHelper.isRepository(workspace)) {
      const targetExistsInGit = await GitHelper.fileExistsInGit(workspace, replacement.target);

      if (targetExistsInGit) {
        await GitHelper.setSkipWorktree(workspace, replacement.target, false);
        await GitHelper.restoreFile(workspace, replacement.target);
      } else {
        const targetPath = NodePathHelper.join(workspace, replacement.target);
        if (FileIOHelper.fileExists(targetPath)) {
          FileIOHelper.deleteFile(targetPath);
        }
      }
    }

    removeActiveReplacement(replacement.name);
  }

  async toggleAllReplacements() {
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

export async function toggleReplacement(replacement: DevPanelReplacement) {
  await providerInstance?.toggleReplacement(replacement);
}

export async function toggleAllReplacements() {
  await providerInstance?.toggleAllReplacements();
}
