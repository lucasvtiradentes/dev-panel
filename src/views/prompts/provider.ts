import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  GLOBAL_ITEM_PREFIX,
  NO_GROUP_NAME,
  getCommandId,
  getGlobalConfigDir,
  getGlobalConfigPath,
} from '../../common/constants';
import { globalPromptsState } from '../../common/lib/global-state';
import { createLogger } from '../../common/lib/logger';
import { Command, ContextKey } from '../../common/lib/vscode-utils';
import { promptsState } from '../../common/lib/workspace-state';
import type { PPConfig } from '../../common/schemas';
import { BaseTreeDataProvider, type ProviderConfig } from '../common';
import { PromptDragAndDropController } from './dnd-controller';
import { PromptGroupTreeItem, TreePrompt } from './items';
import { getPromptKeybinding } from './keybindings-local';
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
  private _treeView: vscode.TreeView<TreePrompt | PromptGroupTreeItem> | null = null;

  constructor() {
    super(promptsState, PROMPTS_CONFIG, null);
  }

  setTreeView(treeView: vscode.TreeView<TreePrompt | PromptGroupTreeItem>): void {
    this._treeView = treeView;
  }

  refresh(): void {
    log.info('refresh() called - tree will re-read config');
    super.refresh();
  }

  get dragAndDropController(): PromptDragAndDropController {
    return new PromptDragAndDropController(
      () => this._grouped,
      () => this.refresh(),
    );
  }

  protected getHiddenItems(): string[] {
    const workspaceHidden = this.stateManager.getHiddenItems();
    const globalHidden = globalPromptsState.getSourceState().hidden.map((name) => `${GLOBAL_ITEM_PREFIX}${name}`);
    return [...workspaceHidden, ...globalHidden];
  }

  protected getFavoriteItems(): string[] {
    const workspaceFavorites = this.stateManager.getFavoriteItems();
    const globalFavorites = globalPromptsState.getSourceState().favorites.map((name) => `${GLOBAL_ITEM_PREFIX}${name}`);
    return [...workspaceFavorites, ...globalFavorites];
  }

  toggleFavorite(item: TreePrompt): void {
    const name = item.getName();
    if (!name) return;

    if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
      globalPromptsState.toggleFavorite(name.substring(GLOBAL_ITEM_PREFIX.length));
    } else {
      promptsState.toggleFavorite(name);
    }

    const favoriteItems = this.getFavoriteItems();
    if (this._showOnlyFavorites && favoriteItems.length === 0) {
      this._showOnlyFavorites = false;
      promptsState.saveShowOnlyFavorites(this._showOnlyFavorites);
    }

    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleHide(item: TreePrompt): void {
    const name = item.getName();
    if (!name) return;

    if (name.startsWith(GLOBAL_ITEM_PREFIX)) {
      globalPromptsState.toggleHidden(name.substring(GLOBAL_ITEM_PREFIX.length));
    } else {
      promptsState.toggleHidden(name);
    }

    const hiddenItems = this.getHiddenItems();
    if (this._showHidden && hiddenItems.length === 0) {
      this._showHidden = false;
      promptsState.saveShowHidden(this._showHidden);
    }

    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  public async getChildren(item?: TreePrompt | PromptGroupTreeItem): Promise<Array<TreePrompt | PromptGroupTreeItem>> {
    if (item instanceof PromptGroupTreeItem) {
      return this.sortElements(item.children);
    }

    return this.getPPPrompts();
  }

  private async getPPPrompts(): Promise<Array<TreePrompt | PromptGroupTreeItem>> {
    const folders = vscode.workspace.workspaceFolders ?? [];

    if (!this._grouped) {
      const promptElements: TreePrompt[] = [];

      const globalPrompts = this.readGlobalPrompts();
      for (const prompt of globalPrompts) {
        const treePrompt = this.createGlobalPrompt(prompt);
        if (treePrompt) promptElements.push(treePrompt);
      }

      for (const folder of folders) {
        const prompts = this.readPPPrompts(folder);
        for (const prompt of prompts) {
          const treePrompt = this.createPPPrompt(prompt, folder);
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
      const prompts = this.readPPPrompts(folder);
      for (const prompt of prompts) {
        const treePrompt = this.createPPPrompt(prompt, folder);
        if (!treePrompt) continue;

        const groupName = prompt.group ?? NO_GROUP_NAME;

        if (!groups[groupName]) {
          groups[groupName] = new PromptGroupTreeItem(groupName);
          promptElements.push(groups[groupName]);
        }
        groups[groupName].children.push(treePrompt);
      }
    }

    return this.sortElements(promptElements);
  }

  private readPPPrompts(folder: vscode.WorkspaceFolder): NonNullable<PPConfig['prompts']> {
    const configPath = `${folder.uri.fsPath}/${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME}`;
    log.debug(`readPPPrompts - reading: ${configPath}`);
    if (!fs.existsSync(configPath)) return [];
    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
    const prompts = config.prompts ?? [];
    log.info(`readPPPrompts - found ${prompts.length} prompts`);
    for (const p of prompts) {
      if (p.inputs) {
        log.debug(`prompt "${p.name}" inputs: ${JSON.stringify(p.inputs)}`);
      }
    }
    return prompts;
  }

  private readGlobalPrompts(): NonNullable<PPConfig['prompts']> {
    const configPath = getGlobalConfigPath();
    log.debug(`readGlobalPrompts - reading: ${configPath}`);
    if (!fs.existsSync(configPath)) return [];
    try {
      const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
      const prompts = config.prompts ?? [];
      log.info(`readGlobalPrompts - found ${prompts.length} prompts`);
      return prompts;
    } catch (error) {
      console.error('Failed to read global prompts config:', error);
      return [];
    }
  }

  private createPPPrompt(
    prompt: NonNullable<PPConfig['prompts']>[number],
    folder: vscode.WorkspaceFolder,
  ): TreePrompt | null {
    const hidden = isHidden(prompt.name);
    const favorite = isFavorite(prompt.name);
    if (hidden && !this._showHidden) return null;
    if (this._showOnlyFavorites && !favorite) return null;

    const promptFilePath = `${folder.uri.fsPath}/${CONFIG_DIR_NAME}/${prompt.file}`;

    const treePrompt = new TreePrompt(prompt.name, promptFilePath, vscode.TreeItemCollapsibleState.None, {
      command: getCommandId(Command.ExecutePrompt),
      title: 'Execute',
      arguments: [promptFilePath, folder, prompt],
    });

    const keybinding = getPromptKeybinding(prompt.name);

    if (keybinding) {
      treePrompt.description = keybinding;
    }

    if (prompt.description) {
      treePrompt.tooltip = prompt.description;
    }

    if (hidden) {
      treePrompt.iconPath = new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('disabledForeground'));
      treePrompt.contextValue = CONTEXT_VALUES.PROMPT_HIDDEN;
    } else if (favorite) {
      treePrompt.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
      treePrompt.contextValue = CONTEXT_VALUES.PROMPT_FAVORITE;
    }

    return treePrompt;
  }

  private createGlobalPrompt(prompt: NonNullable<PPConfig['prompts']>[number]): TreePrompt | null {
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
        arguments: [promptFilePath, null, prompt],
      },
    );

    const keybinding = getPromptKeybinding(prompt.name);
    if (keybinding) {
      treePrompt.description = keybinding;
    }

    if (prompt.description) {
      treePrompt.tooltip = `Global: ${prompt.description}`;
    } else {
      treePrompt.tooltip = 'Global prompt from ~/.pp/config.jsonc';
    }

    if (hidden) {
      treePrompt.iconPath = new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('disabledForeground'));
      treePrompt.contextValue = CONTEXT_VALUES.PROMPT_HIDDEN;
    } else if (favorite) {
      treePrompt.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
      treePrompt.contextValue = CONTEXT_VALUES.PROMPT_FAVORITE;
    }

    return treePrompt;
  }

  getTreeItem(item: TreePrompt | PromptGroupTreeItem): vscode.TreeItem {
    return item;
  }

  dispose(): void {}
}
