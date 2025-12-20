import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Command, ContextKey, getCommandId, setContextKey } from '../../common';
import { CONFIG_DIR_KEY, CONFIG_DIR_NAME } from '../../common/constants';
import type { PPConfig } from '../../common/schemas/types';
import { ToolDragAndDropController } from './dnd-controller';
import { ToolGroupTreeItem, TreeTool } from './items';
import {
  getFavoriteItems,
  getHiddenItems,
  getIsGrouped,
  getOrder,
  getShowHidden,
  getShowOnlyFavorites,
  isFavorite,
  isHidden,
  saveIsGrouped,
  saveShowHidden,
  saveShowOnlyFavorites,
  toggleFavorite as toggleFavoriteState,
  toggleHidden,
} from './state';

export class ToolTreeDataProvider implements vscode.TreeDataProvider<TreeTool | ToolGroupTreeItem> {
  private readonly _onDidChangeTreeData: vscode.EventEmitter<TreeTool | null> =
    new vscode.EventEmitter<TreeTool | null>();

  readonly onDidChangeTreeData: vscode.Event<TreeTool | null> = this._onDidChangeTreeData.event;

  private _grouped: boolean;
  private _showHidden: boolean;
  private _showOnlyFavorites: boolean;
  private _treeView: vscode.TreeView<TreeTool | ToolGroupTreeItem> | null = null;

  constructor() {
    this._grouped = getIsGrouped();
    this._showHidden = getShowHidden();
    this._showOnlyFavorites = getShowOnlyFavorites();
    this.updateContextKeys();
  }

  setTreeView(treeView: vscode.TreeView<TreeTool | ToolGroupTreeItem>): void {
    this._treeView = treeView;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  private updateContextKeys(): void {
    const hiddenItems = getHiddenItems();
    const favoriteItems = getFavoriteItems();
    void setContextKey(ContextKey.ToolsGrouped, this._grouped);
    void setContextKey(ContextKey.ToolsHasHidden, hiddenItems.length > 0);
    void setContextKey(ContextKey.ToolsShowHidden, this._showHidden);
    void setContextKey(ContextKey.ToolsHasFavorites, favoriteItems.length > 0);
    void setContextKey(ContextKey.ToolsShowOnlyFavorites, this._showOnlyFavorites);
  }

  toggleGroupMode(): void {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleShowHidden(): void {
    this._showHidden = !this._showHidden;
    saveShowHidden(this._showHidden);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleShowOnlyFavorites(): void {
    this._showOnlyFavorites = !this._showOnlyFavorites;
    saveShowOnlyFavorites(this._showOnlyFavorites);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleFavorite(item: TreeTool): void {
    if (item?.toolName) {
      toggleFavoriteState(item.toolName);
      this.updateContextKeys();
      this._onDidChangeTreeData.fire(null);
    }
  }

  toggleHide(item: TreeTool): void {
    if (item?.toolName) {
      toggleHidden(item.toolName);
      this.updateContextKeys();
      this._onDidChangeTreeData.fire(null);
    }
  }

  get dragAndDropController(): ToolDragAndDropController {
    return new ToolDragAndDropController(
      () => this._grouped,
      () => this.refresh(),
    );
  }

  private sortElements(elements: Array<ToolGroupTreeItem | TreeTool>): Array<ToolGroupTreeItem | TreeTool> {
    const order = getOrder(this._grouped);

    elements.sort((a, b) => {
      const getLabel = (item: ToolGroupTreeItem | TreeTool): string => {
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

  public async getChildren(item?: TreeTool | ToolGroupTreeItem): Promise<Array<TreeTool | ToolGroupTreeItem>> {
    if (item instanceof ToolGroupTreeItem) {
      return this.sortElements(item.children);
    }

    return this.getPPTools();
  }

  private async getPPTools(): Promise<Array<TreeTool | ToolGroupTreeItem>> {
    const folders = vscode.workspace.workspaceFolders ?? [];

    if (!this._grouped) {
      const toolElements: TreeTool[] = [];
      for (const folder of folders) {
        const tools = this.readPPTools(folder);
        for (const tool of tools) {
          const treeTool = this.createPPTool(tool, folder);
          if (treeTool) toolElements.push(treeTool);
        }
      }
      return this.sortElements(toolElements);
    }

    const toolElements: Array<TreeTool | ToolGroupTreeItem> = [];
    const groups: Record<string, ToolGroupTreeItem> = {};

    for (const folder of folders) {
      const tools = this.readPPTools(folder);
      for (const tool of tools) {
        const treeTool = this.createPPTool(tool, folder);
        if (!treeTool) continue;

        const groupName = tool.group ?? 'no-group';

        if (!groups[groupName]) {
          groups[groupName] = new ToolGroupTreeItem(groupName);
          toolElements.push(groups[groupName]);
        }
        groups[groupName].children.push(treeTool);
      }
    }

    return this.sortElements(toolElements);
  }

  private readPPTools(folder: vscode.WorkspaceFolder): NonNullable<PPConfig['tools']> {
    const configPath = `${folder.uri.fsPath}/${CONFIG_DIR_NAME}/config.jsonc`;
    if (!fs.existsSync(configPath)) return [];
    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
    return config.tools ?? [];
  }

  private extractFileFromCommand(command: string): string | null {
    const match = command.match(/(?:bash\s+|sh\s+|\.\/)?(.+\.sh)$/);
    return match ? match[1] : null;
  }

  private createPPTool(tool: NonNullable<PPConfig['tools']>[number], folder: vscode.WorkspaceFolder): TreeTool | null {
    const hidden = isHidden(tool.name);
    const favorite = isFavorite(tool.name);
    if (hidden && !this._showHidden) return null;
    if (this._showOnlyFavorites && !favorite) return null;

    const shellExec = new vscode.ShellExecution(tool.command);
    const task = new vscode.Task(
      { type: `${CONFIG_DIR_KEY}-tool` },
      folder,
      tool.name,
      `${CONFIG_DIR_KEY}-tool`,
      shellExec,
    );

    const relativeFile = this.extractFileFromCommand(tool.command);
    const toolFilePath = relativeFile ? `${folder.uri.fsPath}/${relativeFile}` : '';

    const treeTool = new TreeTool(tool.name, toolFilePath, vscode.TreeItemCollapsibleState.None, {
      command: getCommandId(Command.ExecuteTool),
      title: 'Execute',
      arguments: [task, folder],
    });

    if (tool.description) {
      treeTool.tooltip = tool.description;
    }

    if (hidden) {
      treeTool.iconPath = new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('disabledForeground'));
      treeTool.contextValue = 'tool-hidden';
    } else if (favorite) {
      treeTool.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
      treeTool.contextValue = 'tool-favorite';
    }

    return treeTool;
  }

  getTreeItem(item: TreeTool | ToolGroupTreeItem): vscode.TreeItem {
    return item;
  }

  dispose(): void {}
}
