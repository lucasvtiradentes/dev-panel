import * as vscode from 'vscode';
import { ExtensionConfigKey, getExtensionConfig } from '../../common';
import { StatusBarManager } from '../../status-bar/status-bar-manager';
import { TreeTask, GroupTreeItem, WorkspaceTreeItem } from './items';

export class TaskTreeDataProvider implements
    vscode.TreeDataProvider<TreeTask | GroupTreeItem | WorkspaceTreeItem> {

    private readonly _onDidChangeTreeData: vscode.EventEmitter<TreeTask | null>
        = new vscode.EventEmitter<TreeTask | null>();

    readonly onDidChangeTreeData: vscode.Event<TreeTask | null>
        = this._onDidChangeTreeData.event;

    private readonly autoRefresh: boolean;
    private _unhide: boolean = false;
    private readonly statusBarManager: StatusBarManager;

    constructor(_context: vscode.ExtensionContext) {
        this.autoRefresh = getExtensionConfig(ExtensionConfigKey.AutoRefresh);
        this.statusBarManager = new StatusBarManager();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(null);
    }

    unhide(): void {
        this._unhide = !this._unhide;
        this._onDidChangeTreeData.fire(null);
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

    private async sortElements(
        elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>
    ): Promise<Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>> {
        elements.sort((a, b) => {
            const getLabel = (
                item: WorkspaceTreeItem | GroupTreeItem | TreeTask
            ): string => {
                const label = typeof item.label === "string"
                    ? item.label
                    : item.label?.label ?? "";
                return label;
            };

            const aLabel = getLabel(a);
            const bLabel = getLabel(b);

            if (aLabel === "other-tasks" && bLabel !== "other-tasks") return 1;
            if (bLabel === "other-tasks" && aLabel !== "other-tasks") return -1;

            return aLabel.localeCompare(bLabel);
        });

        return elements;
    }

    private async getLowestLevel(
        elements: Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>
    ): Promise<Array<WorkspaceTreeItem | TreeTask | GroupTreeItem>> {
        if (
            elements.length === 1 &&
            !(elements[0] instanceof TreeTask)
        ) {
            return await this.getLowestLevel(elements[0].children);
        }
        return elements;
    }

    public async getChildren(
        task?: TreeTask | WorkspaceTreeItem | GroupTreeItem
    ): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
        if (task instanceof WorkspaceTreeItem || task instanceof GroupTreeItem) {
            return await this.sortElements(
                await this.getLowestLevel(task.children)
            );
        }

        let tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
        tasks = tasks.filter(t => t.source === "Workspace");

        const taskElements: Array<WorkspaceTreeItem | TreeTask> = [];
        const taskFolders: { [key: string]: WorkspaceTreeItem } = {};

        for (const task of tasks) {
            const _task = new TreeTask(
                task.definition.type,
                task.name,
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'taskOutlinePlus.executeTask',
                    title: "Execute",
                    arguments: [task, task.scope]
                },
                task.scope,
                (task as any).presentationOptions?.group ?? null
            );

            if (task.detail != null) {
                _task.tooltip = task.detail;
            }

            if (!_task.hide || this._unhide) {
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

        return await this.sortElements(await this.getLowestLevel(taskElements));
    }

    getTreeItem(task: TreeTask | WorkspaceTreeItem | GroupTreeItem): vscode.TreeItem {
        return task;
    }

    dispose(): void {
        this.statusBarManager.dispose();
    }
}
