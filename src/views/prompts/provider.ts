import * as vscode from 'vscode';
import {
  CONTEXT_VALUES,
  DND_MIME_TYPE_PROMPTS,
  GLOBAL_ITEM_PREFIX,
  GLOBAL_PROMPT_TOOLTIP,
  NO_GROUP_NAME,
  getCommandId,
  getGlobalConfigDir,
} from '../../common/constants';
import { getWorkspaceConfigDirPath, loadGlobalConfig, loadWorkspaceConfig } from '../../common/lib/config-manager';
import { globalPromptsState } from '../../common/lib/global-state';
import { createLogger } from '../../common/lib/logger';
import { Command, ContextKey } from '../../common/lib/vscode-utils';
import { promptsState } from '../../common/lib/workspace-state';
import type { DevPanelConfig } from '../../common/schemas';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { TreeItem, TreeView, WorkspaceFolder } from '../../common/vscode/vscode-types';
import { BaseTreeDataProvider, type ProviderConfig, createDragAndDropController } from '../_base';
import { PromptGroupTreeItem, TreePrompt } from './items';
import { isFavorite, isHidden } from './state';

const log = createLogger('prompts-provider');

const PROMPTS_CONFIG: ProviderConfig = {
  contextKeys: {
    grouped: ContextKey.PromptsGrouped,
    hasHidden: ContextKey.PromptsHasHidden,
    showHidden: ContextKey.PromptsShowHidden,
    hasFavorites: ContextKey.PromptsHasFavorites,
    showOnlyFavorites: ContextKey.PromptsShowOnlyFavorites,
  },
};

export class PromptTreeDataProvider extends BaseTreeDataProvider<TreePrompt, PromptGroupTreeItem, void> {
  private _treeView: TreeView<TreePrompt | PromptGroupTreeItem> | null = null;

  constructor() {
    super(promptsState, PROMPTS_CONFIG, null, globalPromptsState);
  }

  setTreeView(treeView: TreeView<TreePrompt | PromptGroupTreeItem>) {
    this._treeView = treeView;
  }

  refresh() {
    log.info('refresh() called - tree will re-read config');
    this.updateContextKeys();
    super.refresh();
  }

  get dragAndDropController() {
    return createDragAndDropController<TreePrompt>(
      DND_MIME_TYPE_PROMPTS,
      promptsState,
      () => this._grouped,
      () => this.refresh(),
    );
  }

  public async getChildren(item?: TreePrompt | PromptGroupTreeItem): Promise<Array<TreePrompt | PromptGroupTreeItem>> {
    if (item instanceof PromptGroupTreeItem) {
      return this.sortElements(item.children);
    }

    return this.getDevPanelPrompts();
  }

  private async getDevPanelPrompts(): Promise<Array<TreePrompt | PromptGroupTreeItem>> {
    const folders = vscode.workspace.workspaceFolders ?? [];

    if (!this._grouped) {
      const promptElements: TreePrompt[] = [];

      const globalPrompts = this.readGlobalPrompts();
      for (const prompt of globalPrompts) {
        const treePrompt = this.createGlobalPrompt(prompt);
        if (treePrompt) promptElements.push(treePrompt);
      }

      for (const folder of folders) {
        const prompts = this.readDevPanelPrompts(folder);
        for (const promptItem of prompts) {
          const treePrompt = this.createDevPanelPrompt(promptItem, folder);
          if (treePrompt) promptElements.push(treePrompt);
        }
      }
      return this.sortElements(promptElements);
    }

    const promptElements: Array<TreePrompt | PromptGroupTreeItem> = [];
    const groups: Record<string, PromptGroupTreeItem> = {};

    const globalPrompts = this.readGlobalPrompts();
    for (const prompt of globalPrompts) {
      const treePrompt = this.createGlobalPrompt(prompt);
      if (!treePrompt) continue;

      const groupName = prompt.group ?? NO_GROUP_NAME;

      if (!groups[groupName]) {
        groups[groupName] = new PromptGroupTreeItem(groupName);
        promptElements.push(groups[groupName]);
      }
      groups[groupName].children.push(treePrompt);
    }

    for (const folder of folders) {
      const prompts = this.readDevPanelPrompts(folder);
      for (const promptItem of prompts) {
        const treePrompt = this.createDevPanelPrompt(promptItem, folder);
        if (!treePrompt) continue;

        const groupName = promptItem.group ?? NO_GROUP_NAME;

        if (!groups[groupName]) {
          groups[groupName] = new PromptGroupTreeItem(groupName);
          promptElements.push(groups[groupName]);
        }
        groups[groupName].children.push(treePrompt);
      }
    }

    return this.sortElements(promptElements);
  }

  private readDevPanelPrompts(folder: WorkspaceFolder): NonNullable<DevPanelConfig['prompts']> {
    const config = loadWorkspaceConfig(folder);
    const prompts = config?.prompts ?? [];
    log.info(`readDevPanelPrompts - found ${prompts.length} prompts`);
    for (const p of prompts) {
      if (p.inputs) {
        log.debug(`prompt "${p.name}" inputs: ${JSON.stringify(p.inputs)}`);
      }
    }
    return prompts;
  }

  private readGlobalPrompts(): NonNullable<DevPanelConfig['prompts']> {
    const config = loadGlobalConfig();
    const prompts = config?.prompts ?? [];
    log.info(`readGlobalPrompts - found ${prompts.length} prompts`);
    return prompts;
  }

  private createDevPanelPrompt(
    prompt: NonNullable<DevPanelConfig['prompts']>[number],
    folder: WorkspaceFolder,
  ): TreePrompt | null {
    const hidden = isHidden(prompt.name);
    const favorite = isFavorite(prompt.name);
    if (hidden && !this._showHidden) return null;
    if (this._showOnlyFavorites && !favorite) return null;

    const configDirPath = getWorkspaceConfigDirPath(folder);
    const promptFilePath = `${configDirPath}/${prompt.file}`;

    const treePrompt = new TreePrompt(prompt.name, promptFilePath, vscode.TreeItemCollapsibleState.None, {
      command: getCommandId(Command.ExecutePrompt),
      title: 'Execute',
      arguments: [{ promptFilePath, folder, promptConfig: prompt }],
    });

    if (prompt.description) {
      treePrompt.tooltip = prompt.description;
    }

    if (hidden) {
      treePrompt.iconPath = VscodeIcons.HiddenItem;
      treePrompt.contextValue = CONTEXT_VALUES.PROMPT_HIDDEN;
    } else if (favorite) {
      treePrompt.iconPath = VscodeIcons.FavoriteItem;
      treePrompt.contextValue = CONTEXT_VALUES.PROMPT_FAVORITE;
    }

    return treePrompt;
  }

  private createGlobalPrompt(prompt: NonNullable<DevPanelConfig['prompts']>[number]): TreePrompt | null {
    const hidden = globalPromptsState.isHidden(prompt.name);
    const favorite = globalPromptsState.isFavorite(prompt.name);

    if (hidden && !this._showHidden) return null;
    if (this._showOnlyFavorites && !favorite) return null;

    const globalConfigDir = getGlobalConfigDir();
    const promptFilePath = `${globalConfigDir}/${prompt.file}`;

    const treePrompt = new TreePrompt(
      `${GLOBAL_ITEM_PREFIX}${prompt.name}`,
      promptFilePath,
      vscode.TreeItemCollapsibleState.None,
      {
        command: getCommandId(Command.ExecutePrompt),
        title: 'Execute',
        arguments: [{ promptFilePath, folder: null, promptConfig: prompt }],
      },
    );

    if (prompt.description) {
      treePrompt.tooltip = `Global: ${prompt.description}`;
    } else {
      treePrompt.tooltip = GLOBAL_PROMPT_TOOLTIP;
    }

    if (hidden) {
      treePrompt.iconPath = VscodeIcons.HiddenItem;
      treePrompt.contextValue = CONTEXT_VALUES.PROMPT_GLOBAL_HIDDEN;
    } else if (favorite) {
      treePrompt.iconPath = VscodeIcons.FavoriteItem;
      treePrompt.contextValue = CONTEXT_VALUES.PROMPT_GLOBAL_FAVORITE;
    } else {
      treePrompt.contextValue = CONTEXT_VALUES.PROMPT_GLOBAL;
    }

    return treePrompt;
  }

  getTreeItem(item: TreePrompt | PromptGroupTreeItem): TreeItem {
    return item;
  }

  // tscanner-ignore-next-line no-empty-function
  dispose() {}
}
