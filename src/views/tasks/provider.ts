import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Command, ContextKey, ExtensionConfigKey, getCommandId, getExtensionConfig, setContextKey } from '../../common';
import { type BPMConfig, TASK_SOURCES, TaskSource } from '../../common/types';
import { StatusBarManager } from '../../status-bar/status-bar-manager';
import { TaskDragAndDropController } from './dnd-controller';
import { GroupTreeItem, TreeTask, WorkspaceTreeItem } from './items';
import {
  getCurrentSource,
  getIsGrouped,
  getOrder,
  isFavorite,
  isHidden,
  saveCurrentSource,
  saveIsGrouped,
  toggleFavorite as toggleFavoriteState,
  toggleHidden,
} from './state';

type PackageJson = {
  scripts?: Record<string, string>;
};

export class TaskTreeDataProvider implements vscode.TreeDataProvider<TreeTask | GroupTreeItem | WorkspaceTreeItem> {
  private readonly _onDidChangeTreeData: vscode.EventEmitter<TreeTask | null> =
    new vscode.EventEmitter<TreeTask | null>();

  readonly onDidChangeTreeData: vscode.Event<TreeTask | null> = this._onDidChangeTreeData.event;

  private readonly autoRefresh: boolean;
  private _source: TaskSource;
  private _grouped: boolean;
  private readonly statusBarManager: StatusBarManager;
  private _treeView: vscode.TreeView<TreeTask | GroupTreeItem | WorkspaceTreeItem> | null = null;

  constructor(_context: vscode.ExtensionContext) {
    this.autoRefresh = getExtensionConfig(ExtensionConfigKey.AutoRefresh);
    this.statusBarManager = new StatusBarManager();
    this._source = getCurrentSource();
    this._grouped = getIsGrouped();
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
    void setContextKey(ContextKey.TaskSourceVSCode, this._source === TaskSource.VSCode);
    void setContextKey(ContextKey.TaskSourcePackage, this._source === TaskSource.Package);
    void setContextKey(ContextKey.TaskSourceBPM, this._source === TaskSource.BPM);
    void setContextKey(ContextKey.TasksGrouped, this._grouped);
  }

  toggleGroupMode(): void {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(null);
  }

  toggleFavorite(item: TreeTask): void {
    if (item?.taskName) {
      toggleFavoriteState(this._source, item.taskName);
      this._onDidChangeTreeData.fire(null);
    }
  }

  toggleHide(item: TreeTask): void {
    if (item?.taskName) {
      toggleHidden(this._source, item.taskName);
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

    switch (this._source) {
      case TaskSource.VSCode:
        return this.getVSCodeTasks();
      case TaskSource.Package:
        return this.getPackageScripts();
      case TaskSource.BPM:
        return this.getBPMScripts();
    }
  }

  private async getVSCodeTasks(): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
    let tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
    tasks = tasks.filter((t) => t.source === 'Workspace');

    const taskElements: Array<WorkspaceTreeItem | TreeTask> = [];
    const taskFolders: Record<string, WorkspaceTreeItem> = {};

    for (const task of tasks) {
      if (isHidden(this._source, task.name)) continue;

      const group = this._grouped
        ? (task as unknown as { presentationOptions?: { group?: string } }).presentationOptions?.group
        : undefined;

      const _task = new TreeTask(
        task.definition.type,
        task.name,
        vscode.TreeItemCollapsibleState.None,
        {
          command: getCommandId(Command.ExecuteTask),
          title: 'Execute',
          arguments: [task, task.scope],
        },
        task.scope,
        group,
      );

      _task.taskName = task.name;

      if (task.detail != null) {
        _task.tooltip = task.detail;
      }

      if (isFavorite(this._source, task.name)) {
        _task.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
      } else if (!_task.iconPath) {
        _task.iconPath = new vscode.ThemeIcon('terminal');
      }

      if (!_task.hide) {
        if (_task.workspace !== null) {
          if (taskFolders[_task.workspace] === undefined) {
            const ws = new WorkspaceTreeItem(_task.workspace);
            taskFolders[_task.workspace] = ws;
            taskElements.push(ws);
          }
          await taskFolders[_task.workspace].addChildren(_task);
        } else {
          taskElements.push(_task);
        }
      }
    }

    return this.sortElements(await this.getLowestLevel(taskElements));
  }

  private async getPackageScripts(): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
    const folders = vscode.workspace.workspaceFolders ?? [];

    if (!this._grouped) {
      const taskElements: TreeTask[] = [];
      for (const folder of folders) {
        const scripts = this.readPackageScripts(folder);
        for (const [name, command] of Object.entries(scripts)) {
          const task = this.createNpmTask(name, command, folder);
          if (task) taskElements.push(task);
        }
      }
      return this.sortElements(taskElements);
    }

    const taskElements: Array<TreeTask | GroupTreeItem> = [];
    const groups: Record<string, GroupTreeItem> = {};

    for (const folder of folders) {
      const scripts = this.readPackageScripts(folder);
      for (const [name, command] of Object.entries(scripts)) {
        const treeTask = this.createNpmTask(name, command, folder);
        if (!treeTask) continue;

        const groupName = this.extractGroupName(name);

        if (!groups[groupName]) {
          groups[groupName] = new GroupTreeItem(groupName);
          taskElements.push(groups[groupName]);
        }
        groups[groupName].children.push(treeTask);
      }
    }

    return this.sortElements(taskElements);
  }

  private readPackageScripts(folder: vscode.WorkspaceFolder): Record<string, string> {
    const packageJsonPath = `${folder.uri.fsPath}/package.json`;
    if (!fs.existsSync(packageJsonPath)) return {};
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
    return packageJson.scripts ?? {};
  }

  private createNpmTask(name: string, command: string, folder: vscode.WorkspaceFolder): TreeTask | null {
    if (isHidden(this._source, name)) return null;

    const shellExec = new vscode.ShellExecution(`npm run ${name}`);
    const task = new vscode.Task({ type: 'npm' }, folder, name, 'npm', shellExec);
    const displayName = this._grouped && name.includes(':') ? name.split(':').slice(1).join(':') : name;

    const treeTask = new TreeTask(
      'npm',
      displayName,
      vscode.TreeItemCollapsibleState.None,
      {
        command: getCommandId(Command.ExecuteTask),
        title: 'Execute',
        arguments: [task, folder],
      },
      folder,
    );
    treeTask.taskName = name;
    treeTask.tooltip = command;

    if (isFavorite(this._source, name)) {
      treeTask.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
    } else {
      treeTask.iconPath = new vscode.ThemeIcon('terminal');
    }

    return treeTask;
  }

  private extractGroupName(scriptName: string): string {
    if (scriptName.includes(':')) {
      return scriptName.split(':')[0];
    }
    return 'no-group';
  }

  private async getBPMScripts(): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
    const folders = vscode.workspace.workspaceFolders ?? [];

    if (!this._grouped) {
      const taskElements: TreeTask[] = [];
      for (const folder of folders) {
        const scripts = this.readBPMScripts(folder);
        for (const script of scripts) {
          const task = this.createBPMTask(script, folder);
          if (task) taskElements.push(task);
        }
      }
      return this.sortElements(taskElements);
    }

    const taskElements: Array<TreeTask | GroupTreeItem> = [];
    const groups: Record<string, GroupTreeItem> = {};

    for (const folder of folders) {
      const scripts = this.readBPMScripts(folder);
      for (const script of scripts) {
        const treeTask = this.createBPMTask(script, folder);
        if (!treeTask) continue;

        const groupName = script.group ?? 'no-group';

        if (!groups[groupName]) {
          groups[groupName] = new GroupTreeItem(groupName);
          taskElements.push(groups[groupName]);
        }
        groups[groupName].children.push(treeTask);
      }
    }

    return this.sortElements(taskElements);
  }

  private readBPMScripts(folder: vscode.WorkspaceFolder): NonNullable<BPMConfig['scripts']> {
    const configPath = `${folder.uri.fsPath}/.bpm/config.jsonc`;
    if (!fs.existsSync(configPath)) return [];
    const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as BPMConfig;
    return config.scripts ?? [];
  }

  private createBPMTask(
    script: NonNullable<BPMConfig['scripts']>[number],
    folder: vscode.WorkspaceFolder,
  ): TreeTask | null {
    if (isHidden(this._source, script.name)) return null;

    const shellExec = new vscode.ShellExecution(script.command);
    const task = new vscode.Task({ type: 'bpm' }, folder, script.name, 'bpm', shellExec);

    const treeTask = new TreeTask(
      'bpm',
      script.name,
      vscode.TreeItemCollapsibleState.None,
      {
        command: getCommandId(Command.ExecuteTask),
        title: 'Execute',
        arguments: [task, folder],
      },
      folder,
    );

    if (script.description) {
      treeTask.tooltip = script.description;
    }

    if (isFavorite(this._source, script.name)) {
      treeTask.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
    } else if (script.icon) {
      treeTask.iconPath = new vscode.ThemeIcon(script.icon);
    } else {
      treeTask.iconPath = new vscode.ThemeIcon('terminal');
    }

    return treeTask;
  }

  getTreeItem(task: TreeTask | WorkspaceTreeItem | GroupTreeItem): vscode.TreeItem {
    return task;
  }

  dispose(): void {
    this.statusBarManager.dispose();
  }
}
