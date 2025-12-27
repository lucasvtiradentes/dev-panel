import {
  CONTEXT_VALUES,
  DND_MIME_TYPE_TOOLS,
  GLOBAL_ITEM_PREFIX,
  GLOBAL_TOOL_TOOLTIP,
  NO_GROUP_NAME,
  SHELL_SCRIPT_PATTERN,
  getCommandId,
  getGlobalConfigDir,
  getGlobalToolInstructionsPath,
} from '../../common/constants';
import { ConfigManager } from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import type { DevPanelConfig } from '../../common/schemas';
import { globalToolsState, toolsState } from '../../common/state';
import { FileIOHelper } from '../../common/utils/file-io';
import { PathHelper } from '../../common/utils/path-helper';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { TreeItem, TreeView, WorkspaceFolder } from '../../common/vscode/vscode-types';
import { Command, ContextKey } from '../../common/vscode/vscode-utils';
import { BaseTreeDataProvider, type ProviderConfig, createDragAndDropController } from '../_view_base';
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
  private _treeView: TreeView<TreeTool | ToolGroupTreeItem> | null = null;

  constructor() {
    super(toolsState, TOOLS_CONFIG, null, globalToolsState);
    this.initializeActiveTools();
  }

  setTreeView(treeView: TreeView<TreeTool | ToolGroupTreeItem>) {
    this._treeView = treeView;
  }

  private initializeActiveTools() {
    const existingActiveTools = getActiveTools();
    if (existingActiveTools.length > 0) return;

    const allTools: string[] = [];
    const globalTools = this.readGlobalTools();
    for (const tool of globalTools) {
      allTools.push(`${GLOBAL_ITEM_PREFIX}${tool.name}`);
    }

    const folders = VscodeHelper.getWorkspaceFolders();
    for (const folder of folders) {
      const tools = this.readDevPanelTools(folder);
      for (const toolItem of tools) {
        allTools.push(toolItem.name);
      }
    }

    setActiveTools(allTools);
  }

  toggleTool(tool: TreeTool) {
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

  refresh() {
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

  public async getChildren(item?: TreeTool | ToolGroupTreeItem): Promise<Array<TreeTool | ToolGroupTreeItem>> {
    if (item instanceof ToolGroupTreeItem) {
      return this.sortElements(item.children);
    }

    return this.getDevPanelTools();
  }

  private async getDevPanelTools(): Promise<Array<TreeTool | ToolGroupTreeItem>> {
    const folders = VscodeHelper.getWorkspaceFolders();

    if (!this._grouped) {
      const toolElements: TreeTool[] = [];

      const globalTools = this.readGlobalTools();
      for (const tool of globalTools) {
        const treeTool = this.createGlobalTool(tool);
        if (treeTool) toolElements.push(treeTool);
      }

      for (const folder of folders) {
        const tools = this.readDevPanelTools(folder);
        for (const toolItem of tools) {
          const treeTool = this.createDevPanelTool(toolItem, folder);
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
      const tools = this.readDevPanelTools(folder);
      for (const toolItem of tools) {
        const treeTool = this.createDevPanelTool(toolItem, folder);
        if (!treeTool) continue;

        const groupName = toolItem.group ?? NO_GROUP_NAME;

        if (!groups[groupName]) {
          groups[groupName] = new ToolGroupTreeItem(groupName);
          toolElements.push(groups[groupName]);
        }
        groups[groupName].children.push(treeTool);
      }
    }

    return this.sortElements(toolElements);
  }

  private readDevPanelTools(folder: WorkspaceFolder): NonNullable<DevPanelConfig['tools']> {
    const config = ConfigManager.loadWorkspaceConfig(folder);
    return config?.tools ?? [];
  }

  private readGlobalTools(): NonNullable<DevPanelConfig['tools']> {
    const config = ConfigManager.loadGlobalConfig();
    return config?.tools ?? [];
  }

  private extractFileFromCommand(command: string): string | null {
    const match = command.match(SHELL_SCRIPT_PATTERN);
    return match ? match[1] : null;
  }

  private readToolDescription(instructionsPath: string): string | null {
    if (!FileIOHelper.fileExists(instructionsPath)) return null;

    const content = FileIOHelper.readFile(instructionsPath);
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

  private createDevPanelTool(
    tool: NonNullable<DevPanelConfig['tools']>[number],
    folder: WorkspaceFolder,
  ): TreeTool | null {
    const hidden = isHidden(tool.name);
    const favorite = isFavorite(tool.name);
    const activeTools = getActiveTools();
    const isActive = activeTools.includes(tool.name);

    if (hidden && !this._showHidden) return null;
    if (this._showOnlyFavorites && !favorite) return null;

    const configDirPath = ConfigManager.getWorkspaceConfigDirPath(folder);
    const toolFilePath = tool.command ? this.extractFileFromCommand(tool.command) : '';
    const fullToolFilePath = toolFilePath ? PathHelper.join(configDirPath, toolFilePath) : '';

    const treeTool = new TreeTool(tool.name, fullToolFilePath, VscodeConstants.TreeItemCollapsibleState.None);

    const instructionsPath = ConfigManager.getWorkspaceToolInstructionsPath(folder, tool.name);
    const description = this.readToolDescription(instructionsPath);
    if (description) {
      treeTool.tooltip = description;
    }

    if (hidden) {
      treeTool.iconPath = VscodeIcons.HiddenItem;
      treeTool.contextValue = CONTEXT_VALUES.TOOL_HIDDEN;
    } else if (favorite) {
      treeTool.iconPath = VscodeIcons.FavoriteItem;
      treeTool.contextValue = CONTEXT_VALUES.TOOL_FAVORITE;
    } else if (isActive) {
      treeTool.iconPath = VscodeIcons.ActiveItem;
      treeTool.contextValue = CONTEXT_VALUES.TOOL;
    }

    treeTool.command = {
      command: getCommandId(Command.ToggleTool),
      title: 'Toggle Tool',
      arguments: [treeTool],
    };

    return treeTool;
  }

  private createGlobalTool(tool: NonNullable<DevPanelConfig['tools']>[number]): TreeTool | null {
    const hidden = globalToolsState.isHidden(tool.name);
    const favorite = globalToolsState.isFavorite(tool.name);
    const activeTools = getActiveTools();
    const globalToolName = `${GLOBAL_ITEM_PREFIX}${tool.name}`;
    const isActive = activeTools.includes(globalToolName);

    if (hidden && !this._showHidden) return null;
    if (this._showOnlyFavorites && !favorite) return null;

    const globalConfigDir = getGlobalConfigDir();
    const toolFilePath = tool.command ? this.extractFileFromCommand(tool.command) : '';
    const fullToolFilePath = toolFilePath ? PathHelper.join(globalConfigDir, toolFilePath) : '';

    const treeTool = new TreeTool(globalToolName, fullToolFilePath, VscodeConstants.TreeItemCollapsibleState.None);

    const instructionsPath = getGlobalToolInstructionsPath(tool.name);
    const description = this.readToolDescription(instructionsPath);
    treeTool.tooltip = description ? `Global: ${description}` : GLOBAL_TOOL_TOOLTIP;

    if (hidden) {
      treeTool.iconPath = VscodeIcons.HiddenItem;
      treeTool.contextValue = CONTEXT_VALUES.TOOL_GLOBAL_HIDDEN;
    } else if (favorite) {
      treeTool.iconPath = VscodeIcons.FavoriteItem;
      treeTool.contextValue = CONTEXT_VALUES.TOOL_GLOBAL_FAVORITE;
    } else if (isActive) {
      treeTool.iconPath = VscodeIcons.ActiveItem;
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

  getTreeItem(item: TreeTool | ToolGroupTreeItem): TreeItem {
    return item;
  }

  // tscanner-ignore-next-line no-empty-function
  dispose() {}
}

let providerInstance: ToolTreeDataProvider | null = null;

export function setToolProviderInstance(instance: ToolTreeDataProvider) {
  providerInstance = instance;
}

export function toggleTool(tool: TreeTool) {
  providerInstance?.toggleTool(tool);
}
