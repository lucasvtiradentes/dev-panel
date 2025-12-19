import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Command, ContextKey, createLogger, getCommandId, setContextKey } from '../../common';
import type { BPMConfig } from '../../common/types';
import { PromptDragAndDropController } from './dnd-controller';
import { PromptGroupTreeItem, TreePrompt } from './items';
import {
  getIsGrouped,
  getOrder,
  isFavorite,
  isHidden,
  saveIsGrouped,
  toggleFavorite as toggleFavoriteState,
  toggleHidden,
} from './state';

const log = createLogger('prompts-provider');

export class PromptTreeDataProvider implements vscode.TreeDataProvider<TreePrompt | PromptGroupTreeItem> {
  private readonly _onDidChangeTreeData: vscode.EventEmitter<TreePrompt | null> =
    new vscode.EventEmitter<TreePrompt | null>();

  readonly onDidChangeTreeData: vscode.Event<TreePrompt | null> = this._onDidChangeTreeData.event;

  private _grouped: boolean;
  private _treeView: vscode.TreeView<TreePrompt | PromptGroupTreeItem> | null = null;

  constructor() {
    this._grouped = getIsGrouped();
    this.updateContextKeys();
  }

  setTreeView(treeView: vscode.TreeView<TreePrompt | PromptGroupTreeItem>): void {
    this._treeView = treeView;
  }

  refresh(): void {
    log.info('refresh() called - tree will re-read config');
    this._onDidChangeTreeData.fire(null);
  }

  private updateContextKeys(): void {
    void setContextKey(ContextKey.PromptsGrouped, this._grouped);
  }

  toggleGroupMode(): void {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleFavorite(item: TreePrompt): void {
    if (item?.promptName) {
      toggleFavoriteState(item.promptName);
      this._onDidChangeTreeData.fire(null);
    }
  }

  toggleHide(item: TreePrompt): void {
    if (item?.promptName) {
      toggleHidden(item.promptName);
      this._onDidChangeTreeData.fire(null);
    }
  }

  get dragAndDropController(): PromptDragAndDropController {
    return new PromptDragAndDropController(
      () => this._grouped,
      () => this.refresh(),
    );
  }

  private sortElements(elements: Array<PromptGroupTreeItem | TreePrompt>): Array<PromptGroupTreeItem | TreePrompt> {
    const order = getOrder(this._grouped);

    elements.sort((a, b) => {
      const getLabel = (item: PromptGroupTreeItem | TreePrompt): string => {
        const label = typeof item.label === 'string' ? item.label : (item.label?.label ?? '');
        return label;
      };

      const aLabel = getLabel(a);
      const bLabel = getLabel(b);

      const aIndex = order.indexOf(aLabel);
      const bIndex = order.indexOf(bLabel);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      if (aLabel === 'no-group' && bLabel !== 'no-group') return 1;
      if (bLabel === 'no-group' && aLabel !== 'no-group') return -1;

      return aLabel.localeCompare(bLabel);
    });

    return elements;
  }

  public async getChildren(item?: TreePrompt | PromptGroupTreeItem): Promise<Array<TreePrompt | PromptGroupTreeItem>> {
    if (item instanceof PromptGroupTreeItem) {
      return this.sortElements(item.children);
    }

    return this.getBPMPrompts();
  }

  private async getBPMPrompts(): Promise<Array<TreePrompt | PromptGroupTreeItem>> {
    const folders = vscode.workspace.workspaceFolders ?? [];

    if (!this._grouped) {
      const promptElements: TreePrompt[] = [];
      for (const folder of folders) {
        const prompts = this.readBPMPrompts(folder);
        for (const prompt of prompts) {
          const treePrompt = this.createBPMPrompt(prompt, folder);
          if (treePrompt) promptElements.push(treePrompt);
        }
      }
      return this.sortElements(promptElements);
    }

    const promptElements: Array<TreePrompt | PromptGroupTreeItem> = [];
    const groups: Record<string, PromptGroupTreeItem> = {};

    for (const folder of folders) {
      const prompts = this.readBPMPrompts(folder);
      for (const prompt of prompts) {
        const treePrompt = this.createBPMPrompt(prompt, folder);
        if (!treePrompt) continue;

        const groupName = prompt.group ?? 'no-group';

        if (!groups[groupName]) {
          groups[groupName] = new PromptGroupTreeItem(groupName);
          promptElements.push(groups[groupName]);
        }
        groups[groupName].children.push(treePrompt);
      }
    }

    return this.sortElements(promptElements);
  }

  private readBPMPrompts(folder: vscode.WorkspaceFolder): NonNullable<BPMConfig['prompts']> {
    const configPath = `${folder.uri.fsPath}/.bpm/config.jsonc`;
    log.debug(`readBPMPrompts - reading: ${configPath}`);
    if (!fs.existsSync(configPath)) return [];
    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as BPMConfig;
    const prompts = config.prompts ?? [];
    log.info(`readBPMPrompts - found ${prompts.length} prompts`);
    for (const p of prompts) {
      if (p.inputs) {
        log.debug(`prompt "${p.name}" inputs: ${JSON.stringify(p.inputs)}`);
      }
    }
    return prompts;
  }

  private createBPMPrompt(
    prompt: NonNullable<BPMConfig['prompts']>[number],
    folder: vscode.WorkspaceFolder,
  ): TreePrompt | null {
    if (isHidden(prompt.name)) return null;

    const promptFilePath = `${folder.uri.fsPath}/.bpm/prompts/${prompt.file}`;

    const treePrompt = new TreePrompt(prompt.name, promptFilePath, vscode.TreeItemCollapsibleState.None, {
      command: getCommandId(Command.ExecutePrompt),
      title: 'Execute',
      arguments: [promptFilePath, folder, prompt],
    });

    if (prompt.description) {
      treePrompt.tooltip = prompt.description;
    }

    if (isFavorite(prompt.name)) {
      treePrompt.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
    } else if (prompt.icon) {
      treePrompt.iconPath = new vscode.ThemeIcon(prompt.icon);
    } else {
      treePrompt.iconPath = new vscode.ThemeIcon('comment-discussion');
    }

    return treePrompt;
  }

  getTreeItem(item: TreePrompt | PromptGroupTreeItem): vscode.TreeItem {
    return item;
  }

  dispose(): void {}
}
