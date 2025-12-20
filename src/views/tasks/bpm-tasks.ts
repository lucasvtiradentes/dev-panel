import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Command, getCommandId } from '../../common';
import { type BPMConfig, TaskSource } from '../../common/types';
import { GroupTreeItem, TreeTask, type WorkspaceTreeItem } from './items';
import { isFavorite, isHidden } from './state';

export async function getBPMScripts(
  grouped: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
  const folders = vscode.workspace.workspaceFolders ?? [];

  if (!grouped) {
    const taskElements: TreeTask[] = [];
    for (const folder of folders) {
      const scripts = readBPMScripts(folder);
      for (const script of scripts) {
        const task = createBPMTask(script, folder);
        if (task) taskElements.push(task);
      }
    }
    return sortFn(taskElements);
  }

  const taskElements: Array<TreeTask | GroupTreeItem> = [];
  const groups: Record<string, GroupTreeItem> = {};

  for (const folder of folders) {
    const scripts = readBPMScripts(folder);
    for (const script of scripts) {
      const treeTask = createBPMTask(script, folder);
      if (!treeTask) continue;

      const groupName = script.group ?? 'no-group';

      if (!groups[groupName]) {
        groups[groupName] = new GroupTreeItem(groupName);
        taskElements.push(groups[groupName]);
      }
      groups[groupName].children.push(treeTask);
    }
  }

  return sortFn(taskElements);
}

function readBPMScripts(folder: vscode.WorkspaceFolder): NonNullable<BPMConfig['scripts']> {
  const configPath = `${folder.uri.fsPath}/.bpm/config.jsonc`;
  if (!fs.existsSync(configPath)) return [];
  const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as BPMConfig;
  return config.scripts ?? [];
}

function createBPMTask(
  script: NonNullable<BPMConfig['scripts']>[number],
  folder: vscode.WorkspaceFolder,
): TreeTask | null {
  if (isHidden(TaskSource.BPM, script.name)) return null;

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

  if (isFavorite(TaskSource.BPM, script.name)) {
    treeTask.iconPath = new vscode.ThemeIcon('heart-filled', new vscode.ThemeColor('charts.red'));
  } else if (script.icon) {
    treeTask.iconPath = new vscode.ThemeIcon(script.icon);
  } else {
    treeTask.iconPath = new vscode.ThemeIcon('terminal');
  }

  return treeTask;
}
