import * as vscode from 'vscode';
import { ContextKey, ExtensionConfigKey, getExtensionConfig, setContextKey } from '../../common';
import { TASK_SOURCES, TaskSource } from '../../common/types';
import { StatusBarManager } from '../../status-bar/status-bar-manager';
import { getBPMScripts } from './bpm-tasks';
import { TaskDragAndDropController } from './dnd-controller';
import { GroupTreeItem, TreeTask, WorkspaceTreeItem } from './items';
import { getPackageScripts } from './package-json';
import {
  getCurrentSource,
  getFavoriteItems,
  getHiddenItems,
  getIsGrouped,
  getOrder,
  getShowHidden,
  getShowOnlyFavorites,
  saveCurrentSource,
  saveIsGrouped,
  saveShowHidden,
  saveShowOnlyFavorites,
  toggleFavorite as toggleFavoriteState,
  toggleHidden,
} from './state';
import { getVSCodeTasks } from './vscode-tasks';

export class TaskTreeDataProvider implements vscode.TreeDataProvider<TreeTask | GroupTreeItem | WorkspaceTreeItem> {
  private readonly _onDidChangeTreeData: vscode.EventEmitter<TreeTask | null> =
    new vscode.EventEmitter<TreeTask | null>();

  readonly onDidChangeTreeData: vscode.Event<TreeTask | null> = this._onDidChangeTreeData.event;

  private readonly autoRefresh: boolean;
  private _source: TaskSource;
  private _grouped: boolean;
  private _showHidden: boolean;
  private _showOnlyFavorites: boolean;
  private readonly statusBarManager: StatusBarManager;
  private _treeView: vscode.TreeView<TreeTask | GroupTreeItem | WorkspaceTreeItem> | null = null;

  constructor(_context: vscode.ExtensionContext) {
    this.autoRefresh = getExtensionConfig(ExtensionConfigKey.AutoRefresh);
    this.statusBarManager = new StatusBarManager();
    this._source = getCurrentSource();
    this._grouped = getIsGrouped();
    this._showHidden = getShowHidden(this._source);
    this._showOnlyFavorites = getShowOnlyFavorites(this._source);
    this.updateContextKeys();
  }

  setTreeView(treeView: vscode.TreeView<TreeTask | GroupTreeItem | WorkspaceTreeItem>): void {
    this._treeView = treeView;
    this.updateViewTitle();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  switchSource(): void {
    const currentIndex = TASK_SOURCES.findIndex((s) => s.id === this._source);
    const nextIndex = (currentIndex + 1) % TASK_SOURCES.length;
    const nextSource = TASK_SOURCES[nextIndex];

    this._source = nextSource.id;
    this._showHidden = getShowHidden(this._source);
    this._showOnlyFavorites = getShowOnlyFavorites(this._source);
    saveCurrentSource(this._source);
    this.updateViewTitle();
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  private updateViewTitle(): void {
    if (!this._treeView) return;
    const source = TASK_SOURCES.find((s) => s.id === this._source);
    if (source) {
      this._treeView.title = `Tasks - ${source.label}`;
    }
  }

  private updateContextKeys(): void {
    const hiddenItems = getHiddenItems(this._source);
    const favoriteItems = getFavoriteItems(this._source);
    void setContextKey(ContextKey.TaskSourceVSCode, this._source === TaskSource.VSCode);
    void setContextKey(ContextKey.TaskSourcePackage, this._source === TaskSource.Package);
    void setContextKey(ContextKey.TaskSourceBPM, this._source === TaskSource.BPM);
    void setContextKey(ContextKey.TasksGrouped, this._grouped);
    void setContextKey(ContextKey.TasksHasHidden, hiddenItems.length > 0);
    void setContextKey(ContextKey.TasksShowHidden, this._showHidden);
    void setContextKey(ContextKey.TasksHasFavorites, favoriteItems.length > 0);
    void setContextKey(ContextKey.TasksShowOnlyFavorites, this._showOnlyFavorites);
  }

  toggleGroupMode(): void {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleShowHidden(): void {
    this._showHidden = !this._showHidden;
    saveShowHidden(this._source, this._showHidden);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleShowOnlyFavorites(): void {
    this._showOnlyFavorites = !this._showOnlyFavorites;
    saveShowOnlyFavorites(this._source, this._showOnlyFavorites);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleFavorite(item: TreeTask): void {
    if (item?.taskName) {
      toggleFavoriteState(this._source, item.taskName);
      this.updateContextKeys();
      this._onDidChangeTreeData.fire(null);
    }
  }

  toggleHide(item: TreeTask): void {
    if (item?.taskName) {
      toggleHidden(this._source, item.taskName);
      this.updateContextKeys();
      this._onDidChangeTreeData.fire(null);
    }
  }

  get currentSource(): TaskSource {
    return this._source;
  }

  get dragAndDropController(): TaskDragAndDropController {
    return new TaskDragAndDropController(
      () => this._source,
      () => this._grouped,
      () => this.refresh(),
    );
  }

  public async putTaskCmd(): Promise<void> {
    await this.statusBarManager.enterCommandMode();
  }

  public async exitTaskCmd(): Promise<void> {
    await this.statusBarManager.exitCommandMode();
  }

  public async backTaskCmd(): Promise<void> {
    await this.statusBarManager.backspace();
  }

  public async tabTaskCmd(): Promise<void> {
    await this.statusBarManager.showTaskList();
  }

  private sortElements(
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ): Array<WorkspaceTreeItem | GroupTreeItem | TreeTask> {
    const order = getOrder(this._source, this._grouped);

    elements.sort((a, b) => {
      const getLabel = (item: WorkspaceTreeItem | GroupTreeItem | TreeTask): string => {
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
      if (aLabel === 'other-tasks' && bLabel !== 'other-tasks') return 1;
      if (bLabel === 'other-tasks' && aLabel !== 'other-tasks') return -1;

      return aLabel.localeCompare(bLabel);
    });

    return elements;
  }

  private async getLowestLevel(
    elements: Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>,
  ): Promise<Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>> {
    if (elements.length === 1 && !(elements[0] instanceof TreeTask)) {
      return await this.getLowestLevel(elements[0].children);
    }
    return elements;
  }

  public async getChildren(
    task?: TreeTask | WorkspaceTreeItem | GroupTreeItem,
  ): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
    if (task instanceof WorkspaceTreeItem || task instanceof GroupTreeItem) {
      return this.sortElements(await this.getLowestLevel(task.children));
    }

    const sortFn = this.sortElements.bind(this);
    const getLowestLevelFn = this.getLowestLevel.bind(this);

    switch (this._source) {
      case TaskSource.VSCode:
        return getVSCodeTasks(this._grouped, this._showHidden, this._showOnlyFavorites, sortFn, getLowestLevelFn);
      case TaskSource.Package:
        return getPackageScripts(this._grouped, this._showHidden, this._showOnlyFavorites, sortFn);
      case TaskSource.BPM:
        return getBPMScripts(this._grouped, this._showHidden, this._showOnlyFavorites, sortFn);
    }
  }

  getTreeItem(task: TreeTask | WorkspaceTreeItem | GroupTreeItem): vscode.TreeItem {
    return task;
  }

  dispose(): void {
    this.statusBarManager.dispose();
  }
}
