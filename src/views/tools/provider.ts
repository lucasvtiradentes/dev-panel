import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Command, ContextKey, getCommandId, setContextKey } from '../../common';
import type { BPMConfig } from '../../common/types';
import { ToolDragAndDropController } from './dnd-controller';
import { ToolGroupTreeItem, TreeTool } from './items';
import {
  getIsGrouped,
  getOrder,
  isFavorite,
  isHidden,
  saveIsGrouped,
  toggleFavorite as toggleFavoriteState,
  toggleHidden,
} from './state';

export class ToolTreeDataProvider implements vscode.TreeDataProvider<TreeTool | ToolGroupTreeItem> {
  private readonly _onDidChangeTreeData: vscode.EventEmitter<TreeTool | null> =
    new vscode.EventEmitter<TreeTool | null>();

  readonly onDidChangeTreeData: vscode.Event<TreeTool | null> = this._onDidChangeTreeData.event;

  private _grouped: boolean;
  private _treeView: vscode.TreeView<TreeTool | ToolGroupTreeItem> | null = null;

  constructor() {
    this._grouped = getIsGrouped();
    this.updateContextKeys();
  }

  setTreeView(treeView: vscode.TreeView<TreeTool | ToolGroupTreeItem>): void {
    this._treeView = treeView;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  private updateContextKeys(): void {
    void setContextKey(ContextKey.ToolsGrouped, this._grouped);
  }

  toggleGroupMode(): void {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleFavorite(item: TreeTool): void {
    if (item?.toolName) {
      toggleFavoriteState(item.toolName);
      this._onDidChangeTreeData.fire(null);
    }
  }

  toggleHide(item: TreeTool): void {
    if (item?.toolName) {
      toggleHidden(item.toolName);
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

    return this.getBPMTools();
  }

  private async getBPMTools(): Promise<Array<TreeTool | ToolGroupTreeItem>> {
    const folders = vscode.workspace.workspaceFolders ?? [];

    if (!this._grouped) {
      const toolElements: TreeTool[] = [];
      for (const folder of folders) {
        const tools = this.readBPMTools(folder);
        for (const tool of tools) {
          const treeTool = this.createBPMTool(tool, folder);
          if (treeTool) toolElements.push(treeTool);
        }
      }
      return this.sortElements(toolElements);
    }

    const toolElements: Array<TreeTool | ToolGroupTreeItem> = [];
    const groups: Record<string, ToolGroupTreeItem> = {};

    for (const folder of folders) {
      const tools = this.readBPMTools(folder);
      for (const tool of tools) {
        const treeTool = this.createBPMTool(tool, folder);
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

  private readBPMTools(folder: vscode.WorkspaceFolder): NonNullable<BPMConfig['tools']> {
    const configPath = `${folder.uri.fsPath}/.bpm/config.jsonc`;
    if (!fs.existsSync(configPath)) return [];
    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as BPMConfig;
    return config.tools ?? [];
  }

  private createBPMTool(
    tool: NonNullable<BPMConfig['tools']>[number],
    folder: vscode.WorkspaceFolder,
  ): TreeTool | null {
    if (isHidden(tool.name)) return null;

    const shellExec = new vscode.ShellExecution(tool.command);
    const task = new vscode.Task({ type: 'bpm-tool' }, folder, tool.name, 'bpm-tool', shellExec);

    const treeTool = new TreeTool(tool.name, vscode.TreeItemCollapsibleState.None, {
      command: getCommandId(Command.ExecuteTool),
      title: 'Execute',
      arguments: [task, folder],
    });

    if (tool.description) {
      treeTool.tooltip = tool.description;
    }

    if (isFavorite(tool.name)) {
      treeTool.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
    }

    return treeTool;
  }

  getTreeItem(item: TreeTool | ToolGroupTreeItem): vscode.TreeItem {
    return item;
  }

  dispose(): void {}
}
