import * as vscode from 'vscode';
import * as fs from 'fs';
import * as JSON5 from 'json5';

export class GroupTreeItem extends vscode.TreeItem {
    children: TreeTask[] = [];

    constructor(groupName: string) {
        super(groupName, vscode.TreeItemCollapsibleState.Expanded);
    }
}

export class WorkspaceTreeItem extends vscode.TreeItem {
    public childrenObject: { [key: string]: GroupTreeItem } = {};
    private static readonly otherGroups = 'other-tasks';

    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
    }

    public async addChildren(child: TreeTask): Promise<void> {
        if (child.group !== null && child.group !== undefined) {
            if (this.childrenObject[child.group] === undefined) {
                const group = new GroupTreeItem(child.group);
                this.childrenObject[child.group] = group;
            }
            this.childrenObject[child.group].children.push(child);
        } else {
            if (this.childrenObject[WorkspaceTreeItem.otherGroups] === undefined) {
                const group = new GroupTreeItem(WorkspaceTreeItem.otherGroups);
                this.childrenObject[WorkspaceTreeItem.otherGroups] = group;
            }
            this.childrenObject[WorkspaceTreeItem.otherGroups].children.push(child);
        }
    }

    public get children(): Array<TreeTask | GroupTreeItem> {
        return Object.values(this.childrenObject);
    }
}

export class TreeTask extends vscode.TreeItem {
    type: string;
    hide: boolean = false;
    workspace: string | null = null;
    group: string | undefined;

    constructor(
        type: string,
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        command?: vscode.Command,
        workspace?: vscode.WorkspaceFolder | vscode.TaskScope,
        group?: string
    ) {
        super(label, collapsibleState);
        this.type = type;
        this.command = command;
        this.label = `${this.label as string}`;
        this.group = group;

        if (typeof workspace === 'object' && workspace !== null) {
            this.workspace = workspace.name;
        } else if (workspace === vscode.TaskScope.Workspace) {
            this.workspace = vscode.workspace.name ?? "root";
        }

        const multiRoot = vscode.workspace.workspaceFolders!.length > 1;

        for (const _workspace of vscode.workspace.workspaceFolders!) {
            let _tasksJson;

            if (
                multiRoot &&
                fs.existsSync(`${_workspace.uri.fsPath}/${_workspace.name}.code-workspace`)
            ) {
                _tasksJson = JSON5.parse(
                    fs.readFileSync(
                        `${_workspace.uri.fsPath}/${_workspace.name}.code-workspace`, 'utf8'
                    )
                ).tasks;

                if (fs.existsSync(`${_workspace.uri.fsPath}/.vscode/tasks.json`)) {
                    const _tasksJsonFile = JSON5.parse(
                        fs.readFileSync(
                            `${_workspace.uri.fsPath}/.vscode/tasks.json`, 'utf8'
                        )
                    );
                    _tasksJson.tasks = [
                        ..._tasksJson.tasks,
                        ..._tasksJsonFile.tasks
                    ]
                }
            } else {
                _tasksJson = JSON5.parse(
                    fs.readFileSync(
                        `${_workspace.uri.fsPath}/.vscode/tasks.json`, 'utf8'
                    )
                );
            }

            for (const _task of _tasksJson.tasks) {
                if (_task.label === this.label) {
                    this.hide = _task.hide ?? false;

                    if (_task.icon != null && _task.icon.id !== "") {
                        this.iconPath = new vscode.ThemeIcon(
                            _task.icon.id,
                            _task.icon.color
                        );
                    }

                    break;
                }
            }
        }
    }
}
