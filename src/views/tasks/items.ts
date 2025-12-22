import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { CONTEXT_VALUES, NO_GROUP_NAME, VSCODE_TASKS_PATH } from '../../common/constants';
import { isMultiRootWorkspace } from '../../common/lib/vscode-utils';
import type { CodeWorkspaceFile, TaskDefinition, TasksJson } from '../../common/schemas/types';
import { BaseGroupTreeItem } from '../common';

export class GroupTreeItem extends BaseGroupTreeItem<TreeTask> {}

export class WorkspaceTreeItem extends vscode.TreeItem {
  public childrenObject: { [key: string]: GroupTreeItem } = {};

  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
  }

  public async addChildren(child: TreeTask): Promise<void> {
    const groupName = child.group ?? NO_GROUP_NAME;
    if (this.childrenObject[groupName] === undefined) {
      const group = new GroupTreeItem(groupName);
      this.childrenObject[groupName] = group;
    }
    this.childrenObject[groupName].children.push(child);
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
  taskName: string;

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
    this.taskName = label;
    this.contextValue = CONTEXT_VALUES.TASK;

    if (typeof workspace === 'object' && workspace !== null) {
      this.workspace = workspace.name;
    } else if (workspace === vscode.TaskScope.Workspace) {
      this.workspace = vscode.workspace.name ?? 'root';
    }

    this.loadTaskMetadata();
  }

  getName(): string {
    return this.taskName;
  }

  setFavorite(isFavorite: boolean): void {
    if (isFavorite) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
    }
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
    const tasksJsonPath = `${basePath}/${VSCODE_TASKS_PATH}`;

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
  }
}
