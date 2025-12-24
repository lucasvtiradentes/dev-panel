import * as fs from 'node:fs';
import { homedir } from 'node:os';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  DND_MIME_TYPE_TOOLS,
  GLOBAL_ITEM_PREFIX,
  NO_GROUP_NAME,
  SHELL_SCRIPT_PATTERN,
  TOOLS_DIR,
  TOOL_INSTRUCTIONS_FILE,
  getCommandId,
  getGlobalConfigDir,
  getGlobalConfigPath,
} from '../../common/constants';
import { getWorkspaceConfigDirPath, getWorkspaceConfigFilePath } from '../../common/lib/config-manager';
import { globalToolsState } from '../../common/lib/global-state';
import { createLogger } from '../../common/lib/logger';
import { Command, ContextKey } from '../../common/lib/vscode-utils';
import { toolsState } from '../../common/lib/workspace-state';
import type { PPConfig } from '../../common/schemas';
import { BaseTreeDataProvider, type ProviderConfig, createDragAndDropController } from '../common';
import { ToolGroupTreeItem, TreeTool } from './items';
import { addActiveTool, getActiveTools, isFavorite, isHidden, removeActiveTool, setActiveTools } from './state';

const logger = createLogger('tools-provider');

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
    super(toolsState, TOOLS_CONFIG, null, globalToolsState);
    this.initializeActiveTools();
  }

  setTreeView(treeView: vscode.TreeView<TreeTool | ToolGroupTreeItem>): void {
    this._treeView = treeView;
  }

  private initializeActiveTools(): void {
    const existingActiveTools = getActiveTools();
    if (existingActiveTools.length > 0) return;

    const allTools: string[] = [];
    const globalTools = this.readGlobalTools();
    for (const tool of globalTools) {
      allTools.push(`${GLOBAL_ITEM_PREFIX}${tool.name}`);
    }

    const folders = vscode.workspace.workspaceFolders ?? [];
    for (const folder of folders) {
      const tools = this.readPPTools(folder);
      for (const tool of tools) {
        allTools.push(tool.name);
      }
    }

    setActiveTools(allTools);
  }

  async toggleTool(tool: TreeTool): Promise<void> {
    logger.info(`toggleTool called for: ${tool?.toolName ?? 'null'}`);

    if (!tool || !tool.toolName) {
      logger.error('toggleTool received null or invalid tool');
      return;
    }

    const activeTools = getActiveTools();
    const isActive = activeTools.includes(tool.toolName);

    logger.info(`Tool ${tool.toolName} is currently ${isActive ? 'active' : 'inactive'}`);

    if (isActive) {
      removeActiveTool(tool.toolName);
      logger.info(`Removed ${tool.toolName} from active tools`);
    } else {
      addActiveTool(tool.toolName);
      logger.info(`Added ${tool.toolName} to active tools`);
    }

    this.refresh();
  }

  refresh(): void {
    this.updateContextKeys();
    super.refresh();
  }

  get dragAndDropController() {
    return createDragAndDropController<TreeTool>(
      DND_MIME_TYPE_TOOLS,
      toolsState,
      () => this._grouped,
      () => this.refresh(),
    );
  }

  protected getHiddenItems(): string[] {
    const workspaceHidden = this.stateManager.getHiddenItems();
    const globalHidden = globalToolsState.getSourceState().hidden.map((name) => `${GLOBAL_ITEM_PREFIX}${name}`);
    return [...workspaceHidden, ...globalHidden];
  }

  protected getFavoriteItems(): string[] {
    const workspaceFavorites = this.stateManager.getFavoriteItems();
    const globalFavorites = globalToolsState.getSourceState().favorites.map((name) => `${GLOBAL_ITEM_PREFIX}${name}`);
    return [...workspaceFavorites, ...globalFavorites];
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

      const globalTools = this.readGlobalTools();
      for (const tool of globalTools) {
        const treeTool = this.createGlobalTool(tool);
        if (treeTool) toolElements.push(treeTool);
      }

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

    const globalTools = this.readGlobalTools();
    for (const tool of globalTools) {
      const treeTool = this.createGlobalTool(tool);
      if (!treeTool) continue;

      const groupName = tool.group ?? NO_GROUP_NAME;

      if (!groups[groupName]) {
        groups[groupName] = new ToolGroupTreeItem(groupName);
        toolElements.push(groups[groupName]);
      }
      groups[groupName].children.push(treeTool);
    }

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
    const configPath = getWorkspaceConfigFilePath(folder, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) return [];
    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
    return config.tools ?? [];
  }

  private readGlobalTools(): NonNullable<PPConfig['tools']> {
    const configPath = getGlobalConfigPath();
    if (!fs.existsSync(configPath)) return [];
    try {
      const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
      return config.tools ?? [];
    } catch {
      return [];
    }
  }

  private extractFileFromCommand(command: string): string | null {
    const match = command.match(SHELL_SCRIPT_PATTERN);
    return match ? match[1] : null;
  }

  private readToolDescription(toolName: string, configDirPath: string): string | null {
    const instructionsPath = `${configDirPath}/${TOOLS_DIR}/${toolName}/${TOOL_INSTRUCTIONS_FILE}`;
    if (!fs.existsSync(instructionsPath)) return null;

    const content = fs.readFileSync(instructionsPath, 'utf8');
    const lines = content.split('\n');
    const descriptionBuffer: string[] = [];
    let inDescriptionSection = false;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        const section = line.slice(2).toLowerCase().trim();
        inDescriptionSection = section === 'description';
        continue;
      }

      if (inDescriptionSection) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          descriptionBuffer.push(trimmed);
        } else if (trimmed.startsWith('#')) {
          break;
        }
      }
    }

    return descriptionBuffer.length > 0 ? descriptionBuffer.join(' ') : null;
  }

  private createPPTool(tool: NonNullable<PPConfig['tools']>[number], folder: vscode.WorkspaceFolder): TreeTool | null {
    const hidden = isHidden(tool.name);
    const favorite = isFavorite(tool.name);
    const activeTools = getActiveTools();
    const isActive = activeTools.includes(tool.name);

    if (hidden && !this._showHidden) return null;
    if (this._showOnlyFavorites && !favorite) return null;

    const configDirPath = getWorkspaceConfigDirPath(folder);
    const toolFilePath = tool.command ? this.extractFileFromCommand(tool.command) : '';
    const fullToolFilePath = toolFilePath ? `${configDirPath}/${toolFilePath}` : '';

    const treeTool = new TreeTool(tool.name, fullToolFilePath, vscode.TreeItemCollapsibleState.None);

    const configDirPath2 = getWorkspaceConfigDirPath(folder);
    const description = this.readToolDescription(tool.name, configDirPath2);
    if (description) {
      treeTool.tooltip = description;
    }

    if (hidden) {
      treeTool.iconPath = new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('disabledForeground'));
      treeTool.contextValue = CONTEXT_VALUES.TOOL_HIDDEN;
    } else if (favorite) {
      treeTool.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
      treeTool.contextValue = CONTEXT_VALUES.TOOL_FAVORITE;
    } else if (isActive) {
      treeTool.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
      treeTool.contextValue = CONTEXT_VALUES.TOOL;
    }

    treeTool.command = {
      command: getCommandId(Command.ToggleTool),
      title: 'Toggle Tool',
      arguments: [treeTool],
    };

    return treeTool;
  }

  private createGlobalTool(tool: NonNullable<PPConfig['tools']>[number]): TreeTool | null {
    const hidden = globalToolsState.isHidden(tool.name);
    const favorite = globalToolsState.isFavorite(tool.name);
    const activeTools = getActiveTools();
    const globalToolName = `${GLOBAL_ITEM_PREFIX}${tool.name}`;
    const isActive = activeTools.includes(globalToolName);

    if (hidden && !this._showHidden) return null;
    if (this._showOnlyFavorites && !favorite) return null;

    const globalConfigDir = getGlobalConfigDir();
    const toolFilePath = tool.command ? this.extractFileFromCommand(tool.command) : '';
    const fullToolFilePath = toolFilePath ? `${globalConfigDir}/${toolFilePath}` : '';

    const treeTool = new TreeTool(globalToolName, fullToolFilePath, vscode.TreeItemCollapsibleState.None);

    const description = this.readToolDescription(tool.name, homedir());
    treeTool.tooltip = description ? `Global: ${description}` : 'Global tool from ~/.pp/config.jsonc';

    if (hidden) {
      treeTool.iconPath = new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('disabledForeground'));
      treeTool.contextValue = CONTEXT_VALUES.TOOL_GLOBAL_HIDDEN;
    } else if (favorite) {
      treeTool.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
      treeTool.contextValue = CONTEXT_VALUES.TOOL_GLOBAL_FAVORITE;
    } else if (isActive) {
      treeTool.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
      treeTool.contextValue = CONTEXT_VALUES.TOOL_GLOBAL;
    } else {
      treeTool.contextValue = CONTEXT_VALUES.TOOL_GLOBAL;
    }

    treeTool.command = {
      command: getCommandId(Command.ToggleTool),
      title: 'Toggle Tool',
      arguments: [treeTool],
    };

    return treeTool;
  }

  getTreeItem(item: TreeTool | ToolGroupTreeItem): vscode.TreeItem {
    return item;
  }

  dispose(): void {}
}

let providerInstance: ToolTreeDataProvider | null = null;

export function setToolProviderInstance(instance: ToolTreeDataProvider): void {
  providerInstance = instance;
}

export async function toggleTool(tool: TreeTool): Promise<void> {
  await providerInstance?.toggleTool(tool);
}
