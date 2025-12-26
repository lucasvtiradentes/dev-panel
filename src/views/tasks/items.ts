import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { CONTEXT_VALUES, NO_GROUP_NAME, VSCODE_TASKS_PATH } from '../../common/constants';
import { isMultiRootWorkspace } from '../../common/lib/vscode-utils';
import type { CodeWorkspaceFile, TaskDefinition, TasksJson } from '../../common/schemas/types';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { Command, TreeItemCollapsibleState, WorkspaceFolder } from '../../common/vscode/vscode-types';
import { BaseGroupTreeItem } from '../_base';

function loadCodeWorkspace(filePath: string): CodeWorkspaceFile | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as CodeWorkspaceFile;
  } catch {
    return null;
  }
}

function loadTasksJson(filePath: string): TasksJson | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as TasksJson;
  } catch {
    return null;
  }
}

export class GroupTreeItem extends BaseGroupTreeItem<TreeTask> {}

export class WorkspaceTreeItem extends vscode.TreeItem {
  public childrenObject: { [key: string]: GroupTreeItem } = {};

  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
  }

  public addChildren(child: TreeTask) {
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
    collapsibleState: TreeItemCollapsibleState,
    command?: Command,
    workspace?: WorkspaceFolder | vscode.TaskScope,
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

  setFavorite(isFavorite: boolean) {
    if (isFavorite) {
      this.iconPath = VscodeIcons.FavoriteItem;
    }
  }

  private loadTaskMetadata() {
    const multiRoot = isMultiRootWorkspace();
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) return;

    for (const workspaceFolder of workspaceFolders) {
      const tasksJson = this.loadTasksJsonForWorkspace(workspaceFolder, multiRoot);
      if (!tasksJson) continue;

      const taskDef = tasksJson.tasks.find((t) => t.label === this.label);
      if (taskDef) {
        this.applyTaskDefinition(taskDef);
        break;
      }
    }
  }

  private loadTasksJsonForWorkspace(workspaceFolder: WorkspaceFolder, multiRoot: boolean): TasksJson | null {
    const basePath = workspaceFolder.uri.fsPath;
    const codeWorkspacePath = `${basePath}/${workspaceFolder.name}.code-workspace`;
    const tasksJsonPath = `${basePath}/${VSCODE_TASKS_PATH}`;

    if (multiRoot) {
      const codeWorkspace = loadCodeWorkspace(codeWorkspacePath);
      if (codeWorkspace) {
        let tasks = codeWorkspace.tasks?.tasks ?? [];

        const tasksJsonFile = loadTasksJson(tasksJsonPath);
        if (tasksJsonFile) {
          tasks = [...tasks, ...tasksJsonFile.tasks];
        }

        return { tasks };
      }
    }

    return loadTasksJson(tasksJsonPath);
  }

  private applyTaskDefinition(taskDef: TaskDefinition) {
    this.hide = taskDef.hide ?? false;
  }
}
