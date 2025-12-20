import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { Command, getCommandId } from '../../common';
import { TaskSource } from '../../common/types';
import { GroupTreeItem, TreeTask, type WorkspaceTreeItem } from './items';
import { isFavorite, isHidden } from './state';

type PackageJson = {
  scripts?: Record<string, string>;
};

export async function getPackageScripts(
  grouped: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
  const folders = vscode.workspace.workspaceFolders ?? [];

  if (!grouped) {
    const taskElements: TreeTask[] = [];
    for (const folder of folders) {
      const scripts = readPackageScripts(folder);
      for (const [name, command] of Object.entries(scripts)) {
        const task = createNpmTask(name, command, folder, grouped);
        if (task) taskElements.push(task);
      }
    }
    return sortFn(taskElements);
  }

  const taskElements: Array<TreeTask | GroupTreeItem> = [];
  const groups: Record<string, GroupTreeItem> = {};

  const allScripts: Array<{ name: string; command: string; folder: vscode.WorkspaceFolder }> = [];
  for (const folder of folders) {
    const scripts = readPackageScripts(folder);
    for (const [name, command] of Object.entries(scripts)) {
      allScripts.push({ name, command, folder });
    }
  }

  const allScriptNames = allScripts.map((s) => s.name);

  for (const { name, command, folder } of allScripts) {
    const treeTask = createNpmTask(name, command, folder, grouped);
    if (!treeTask) continue;

    const groupName = extractGroupName(name, allScriptNames);

    if (!groups[groupName]) {
      groups[groupName] = new GroupTreeItem(groupName);
      taskElements.push(groups[groupName]);
    }
    groups[groupName].children.push(treeTask);
  }

  return sortFn(taskElements);
}

function readPackageScripts(folder: vscode.WorkspaceFolder): Record<string, string> {
  const packageJsonPath = `${folder.uri.fsPath}/package.json`;
  if (!fs.existsSync(packageJsonPath)) return {};
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
  return packageJson.scripts ?? {};
}

function createNpmTask(
  name: string,
  command: string,
  folder: vscode.WorkspaceFolder,
  grouped: boolean,
): TreeTask | null {
  if (isHidden(TaskSource.Package, name)) return null;

  const shellExec = new vscode.ShellExecution(`npm run ${name}`);
  const task = new vscode.Task({ type: 'npm' }, folder, name, 'npm', shellExec);
  const displayName = grouped && name.includes(':') ? name.split(':').slice(1).join(':') : name;

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

  if (isFavorite(TaskSource.Package, name)) {
    treeTask.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
  } else {
    treeTask.iconPath = new vscode.ThemeIcon('terminal');
  }

  return treeTask;
}

function extractGroupName(scriptName: string, allScriptNames: string[]): string {
  if (scriptName.includes(':')) {
    return scriptName.split(':')[0];
  }

  const hasRelatedScripts = allScriptNames.some((name) => name.startsWith(`${scriptName}:`));
  if (hasRelatedScripts) {
    return scriptName;
  }

  return 'no-group';
}
