import * as fs from 'node:fs';
import * as JSON5 from 'json5';
import * as vscode from 'vscode';
import { isMultiRootWorkspace } from '../../common';
import type { CodeWorkspaceFile, TaskDefinition, TasksJson } from '../../common/types';

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
  hide = false;
  workspace: string | null = null;
  group: string | undefined;

  constructor(
    type: string,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command,
    workspace?: vscode.WorkspaceFolder | vscode.TaskScope,
    group?: string,
  ) {
    super(label, collapsibleState);
    this.type = type;
    this.command = command;
    this.label = `${this.label as string}`;
    this.group = group;

    if (typeof workspace === 'object' && workspace !== null) {
      this.workspace = workspace.name;
    } else if (workspace === vscode.TaskScope.Workspace) {
      this.workspace = vscode.workspace.name ?? 'root';
    }

    this.loadTaskMetadata();
  }

  private loadTaskMetadata(): void {
    const multiRoot = isMultiRootWorkspace();

    for (const workspaceFolder of vscode.workspace.workspaceFolders!) {
      const tasksJson = this.loadTasksJson(workspaceFolder, multiRoot);
      if (!tasksJson) continue;

      const taskDef = tasksJson.tasks.find((t) => t.label === this.label);
      if (taskDef) {
        this.applyTaskDefinition(taskDef);
        break;
      }
    }
  }

  private loadTasksJson(workspaceFolder: vscode.WorkspaceFolder, multiRoot: boolean): TasksJson | null {
    const basePath = workspaceFolder.uri.fsPath;
    const codeWorkspacePath = `${basePath}/${workspaceFolder.name}.code-workspace`;
    const tasksJsonPath = `${basePath}/.vscode/tasks.json`;

    if (multiRoot && fs.existsSync(codeWorkspacePath)) {
      const codeWorkspace = JSON5.parse(fs.readFileSync(codeWorkspacePath, 'utf8')) as CodeWorkspaceFile;

      let tasks = codeWorkspace.tasks?.tasks ?? [];

      if (fs.existsSync(tasksJsonPath)) {
        const tasksJsonFile = JSON5.parse(fs.readFileSync(tasksJsonPath, 'utf8')) as TasksJson;
        tasks = [...tasks, ...tasksJsonFile.tasks];
      }

      return { tasks };
    }

    if (fs.existsSync(tasksJsonPath)) {
      return JSON5.parse(fs.readFileSync(tasksJsonPath, 'utf8')) as TasksJson;
    }

    return null;
  }

  private applyTaskDefinition(taskDef: TaskDefinition): void {
    this.hide = taskDef.hide ?? false;

    if (taskDef.icon?.id) {
      const color = taskDef.icon.color ? new vscode.ThemeColor(taskDef.icon.color) : undefined;
      this.iconPath = new vscode.ThemeIcon(taskDef.icon.id, color);
    }
  }
}
