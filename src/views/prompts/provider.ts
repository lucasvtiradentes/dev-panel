import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { getCommandId } from '../../common/constants';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, CONTEXT_VALUES, NO_GROUP_NAME } from '../../common/constants';
import { createLogger } from '../../common/lib/logger';
import { Command, ContextKey } from '../../common/lib/vscode-utils';
import { promptsState } from '../../common/lib/workspace-state';
import type { PPConfig } from '../../common/schemas/types';
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

  getTreeItem(item: TreePrompt | PromptGroupTreeItem): vscode.TreeItem {
    return item;
  }

  dispose(): void {}
}
