import { DND_MIME_TYPE_TASKS, NO_GROUP_NAME } from '../../common/constants';
import { TASK_SOURCES, TaskSource } from '../../common/schemas/types';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { Event, EventEmitter, TreeDataProvider, TreeItem, TreeView } from '../../common/vscode/vscode-types';
import { ContextKey, ExtensionConfigKey, getExtensionConfig, setContextKey } from '../../common/vscode/vscode-utils';
import { tasksState } from '../../common/workspace-state';
import { createSourcedDragAndDropController } from '../_view_base';
import { getDevPanelTasks, hasDevPanelGroups } from './devpanel-tasks';
import { GroupTreeItem, TreeTask, WorkspaceTreeItem } from './items';
import { getPackageScripts, hasPackageGroups } from './package-json';
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
import { getVSCodeTasks, hasVSCodeGroups } from './vscode-tasks';

export class TaskTreeDataProvider implements TreeDataProvider<TreeTask | GroupTreeItem | WorkspaceTreeItem> {
  private readonly _onDidChangeTreeData: EventEmitter<TreeTask | null> =
    VscodeHelper.createEventEmitter<TreeTask | null>();

  readonly onDidChangeTreeData: Event<TreeTask | null> = this._onDidChangeTreeData.event;

  private readonly autoRefresh: boolean;
  private _source: TaskSource;
  private _grouped: boolean;
  private _showHidden: boolean;
  private _showOnlyFavorites: boolean;
  private _treeView: TreeView<TreeTask | GroupTreeItem | WorkspaceTreeItem> | null = null;

  constructor() {
    this.autoRefresh = getExtensionConfig(ExtensionConfigKey.AutoRefresh);
    this._source = getCurrentSource();
    this._grouped = getIsGrouped();
    this._showHidden = getShowHidden(this._source);
    this._showOnlyFavorites = getShowOnlyFavorites(this._source);
    this.updateContextKeys();
  }

  setTreeView(treeView: TreeView<TreeTask | GroupTreeItem | WorkspaceTreeItem>) {
    this._treeView = treeView;
    this.updateViewTitle();
  }

  refresh() {
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  switchSource() {
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

  private updateViewTitle() {
    if (!this._treeView) return;
    const source = TASK_SOURCES.find((s) => s.id === this._source);
    if (source) {
      this._treeView.title = `Tasks - ${source.label}`;
    }
  }

  private async checkHasGroups(): Promise<boolean> {
    switch (this._source) {
      case TaskSource.VSCode:
        return hasVSCodeGroups();
      case TaskSource.Package:
        return hasPackageGroups();
      case TaskSource.DevPanel:
        return hasDevPanelGroups();
    }
  }

  private async updateContextKeys() {
    const hiddenItems = getHiddenItems(this._source);
    const favoriteItems = getFavoriteItems(this._source);
    const hasGroups = await this.checkHasGroups();
    void setContextKey(ContextKey.TaskSourceVSCode, this._source === TaskSource.VSCode);
    void setContextKey(ContextKey.TaskSourcePackage, this._source === TaskSource.Package);
    void setContextKey(ContextKey.TaskSourceDevPanel, this._source === TaskSource.DevPanel);
    void setContextKey(ContextKey.TasksGrouped, this._grouped);
    void setContextKey(ContextKey.TasksHasGroups, hasGroups);
    void setContextKey(ContextKey.TasksHasHidden, hiddenItems.length > 0);
    void setContextKey(ContextKey.TasksShowHidden, this._showHidden);
    void setContextKey(ContextKey.TasksHasFavorites, favoriteItems.length > 0);
    void setContextKey(ContextKey.TasksShowOnlyFavorites, this._showOnlyFavorites);
  }

  toggleGroupMode() {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleShowHidden() {
    this._showHidden = !this._showHidden;
    saveShowHidden(this._source, this._showHidden);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleShowOnlyFavorites() {
    this._showOnlyFavorites = !this._showOnlyFavorites;
    saveShowOnlyFavorites(this._source, this._showOnlyFavorites);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleFavorite(item: TreeTask) {
    if (item?.taskName) {
      toggleFavoriteState(this._source, item.taskName);
      this.updateContextKeys();
      this._onDidChangeTreeData.fire(null);
    }
  }

  toggleHide(item: TreeTask) {
    if (item?.taskName) {
      toggleHidden(this._source, item.taskName);
      this.updateContextKeys();
      this._onDidChangeTreeData.fire(null);
    }
  }

  get currentSource(): TaskSource {
    return this._source;
  }

  get dragAndDropController() {
    return createSourcedDragAndDropController<TreeTask, TaskSource>({
      mimeType: DND_MIME_TYPE_TASKS,
      stateManager: tasksState,
      getIsGrouped: () => this._grouped,
      getSource: () => this._source,
      onReorder: () => this.refresh(),
    });
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

      if (aLabel === NO_GROUP_NAME && bLabel !== NO_GROUP_NAME) return 1;
      if (bLabel === NO_GROUP_NAME && aLabel !== NO_GROUP_NAME) return -1;

      return aLabel.localeCompare(bLabel);
    });

    return elements;
  }

  private async getLowestLevel(
    elements: Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>,
  ): Promise<Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>> {
    if (elements.length === 1 && !(elements[0] instanceof TreeTask)) {
      return this.getLowestLevel(elements[0].children);
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
        return getVSCodeTasks({
          grouped: this._grouped,
          showHidden: this._showHidden,
          showOnlyFavorites: this._showOnlyFavorites,
          sortFn,
          getLowestLevel: getLowestLevelFn,
        });
      case TaskSource.Package:
        return getPackageScripts(this._grouped, this._showHidden, this._showOnlyFavorites, sortFn);
      case TaskSource.DevPanel:
        return getDevPanelTasks(this._grouped, this._showHidden, this._showOnlyFavorites, sortFn);
    }
  }

  getTreeItem(task: TreeTask | WorkspaceTreeItem | GroupTreeItem): TreeItem {
    return task;
  }

  // tscanner-ignore-next-line no-empty-function
  dispose() {}
}
