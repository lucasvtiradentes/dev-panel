import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Command, ContextKey, getCommandId } from '../../common';
import { CONFIG_DIR_KEY, CONFIG_DIR_NAME, CONFIG_FILE_NAME, NO_GROUP_NAME } from '../../common/constants';
import { toolsState } from '../../common/lib/workspace-state';
import type { PPConfig } from '../../common/schemas/types';
import { BaseTreeDataProvider, type ProviderConfig } from '../common';
import { ToolDragAndDropController } from './dnd-controller';
import { ToolGroupTreeItem, TreeTool } from './items';
import { isFavorite, isHidden } from './state';

const TOOLS_CONFIG: ProviderConfig = {
  contextKeys: {
    grouped: ContextKey.ToolsGrouped,
    hasHidden: ContextKey.ToolsHasHidden,
    showHidden: ContextKey.ToolsShowHidden,
    hasFavorites: ContextKey.ToolsHasFavorites,
    showOnlyFavorites: ContextKey.ToolsShowOnlyFavorites,
  },
};

export class ToolTreeDataProvider extends BaseTreeDataProvider<TreeTool, ToolGroupTreeItem, void> {
  private _treeView: vscode.TreeView<TreeTool | ToolGroupTreeItem> | null = null;

  constructor() {
    super(toolsState, TOOLS_CONFIG, null);
  }

  setTreeView(treeView: vscode.TreeView<TreeTool | ToolGroupTreeItem>): void {
    this._treeView = treeView;
  }

  get dragAndDropController(): ToolDragAndDropController {
    return new ToolDragAndDropController(
      () => this._grouped,
      () => this.refresh(),
    );
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

        const groupName = tool.group ?? NO_GROUP_NAME;

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
    const configPath = `${folder.uri.fsPath}/${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME}`;
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

    const shellExec = new vscode.ShellExecution(tool.command, { cwd: `${folder.uri.fsPath}/${CONFIG_DIR_NAME}` });
    const task = new vscode.Task(
      { type: `${CONFIG_DIR_KEY}-tool` },
      folder,
      tool.name,
      `${CONFIG_DIR_KEY}-tool`,
      shellExec,
    );

    const relativeFile = this.extractFileFromCommand(tool.command);
    const toolFilePath = relativeFile ? `${folder.uri.fsPath}/${CONFIG_DIR_NAME}/${relativeFile}` : '';

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
