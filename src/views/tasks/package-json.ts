import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Command, getCommandId } from '../../common';
import { TaskSource } from '../../common/types';
import { GroupTreeItem, TreeTask, type WorkspaceTreeItem } from './items';
import { isFavorite, isHidden } from './state';

type PackageJson = {
  scripts?: Record<string, string>;
};

type PackageLocation = {
  relativePath: string;
  absolutePath: string;
  scripts: Record<string, string>;
  folder: vscode.WorkspaceFolder;
};

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'out', '.ignore', '.git', 'coverage', '.bpm']);

export async function getPackageScripts(
  grouped: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const allPackages: PackageLocation[] = [];

  for (const folder of folders) {
    const packages = await findAllPackageJsons(folder);
    allPackages.push(...packages);
  }

  if (allPackages.length === 0) {
    return [];
  }

  const isSinglePackage = allPackages.length === 1 && allPackages[0].relativePath === 'root';

  if (isSinglePackage && !grouped) {
    const pkg = allPackages[0];
    const taskElements: TreeTask[] = [];
    for (const [name, command] of Object.entries(pkg.scripts)) {
      const task = createNpmTask(name, command, pkg.folder, pkg.absolutePath, false);
      if (task) taskElements.push(task);
    }
    return sortFn(taskElements);
  }

  if (isSinglePackage && grouped) {
    return getGroupedByScriptPrefix(allPackages[0], sortFn);
  }

  return getGroupedByLocation(allPackages, sortFn);
}

async function findAllPackageJsons(folder: vscode.WorkspaceFolder): Promise<PackageLocation[]> {
  const packages: PackageLocation[] = [];
  const rootPath = folder.uri.fsPath;

  const packageJsonPaths = findPackageJsonsRecursive(rootPath);

  for (const pkgPath of packageJsonPaths) {
    const scripts = readPackageScripts(pkgPath);
    if (Object.keys(scripts).length === 0) continue;

    const pkgDir = path.dirname(pkgPath);
    const relativePath = path.relative(rootPath, pkgDir) || 'root';

    packages.push({
      relativePath,
      absolutePath: pkgDir,
      scripts,
      folder,
    });
  }

  packages.sort((a, b) => {
    if (a.relativePath === 'root') return -1;
    if (b.relativePath === 'root') return 1;
    return a.relativePath.localeCompare(b.relativePath);
  });

  return packages;
}

function findPackageJsonsRecursive(dir: string, maxDepth = 5, currentDepth = 0): string[] {
  if (currentDepth > maxDepth) return [];

  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'package.json' && entry.isFile()) {
        results.push(path.join(dir, entry.name));
      } else if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name) && !entry.name.startsWith('dist-')) {
        results.push(...findPackageJsonsRecursive(path.join(dir, entry.name), maxDepth, currentDepth + 1));
      }
    }
  } catch {
    // ignore permission errors
  }

  return results;
}

function getGroupedByLocation(
  packages: PackageLocation[],
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Array<TreeTask | GroupTreeItem | WorkspaceTreeItem> {
  const taskElements: Array<TreeTask | GroupTreeItem> = [];

  for (const pkg of packages) {
    const groupName = pkg.relativePath === 'root' ? 'root' : pkg.relativePath;
    const group = new GroupTreeItem(groupName);

    for (const [name, command] of Object.entries(pkg.scripts)) {
      const task = createNpmTask(name, command, pkg.folder, pkg.absolutePath, false);
      if (task) group.children.push(task);
    }

    if (group.children.length > 0) {
      taskElements.push(group);
    }
  }

  return sortFn(taskElements);
}

function getGroupedByScriptPrefix(
  pkg: PackageLocation,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Array<TreeTask | GroupTreeItem | WorkspaceTreeItem> {
  const taskElements: Array<TreeTask | GroupTreeItem> = [];
  const groups: Record<string, GroupTreeItem> = {};
  const allScriptNames = Object.keys(pkg.scripts);

  for (const [name, command] of Object.entries(pkg.scripts)) {
    const treeTask = createNpmTask(name, command, pkg.folder, pkg.absolutePath, true);
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

function readPackageScripts(packageJsonPath: string): Record<string, string> {
  if (!fs.existsSync(packageJsonPath)) return {};
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
    return packageJson.scripts ?? {};
  } catch {
    return {};
  }
}

function createNpmTask(
  name: string,
  command: string,
  folder: vscode.WorkspaceFolder,
  cwd: string,
  useDisplayName: boolean,
): TreeTask | null {
  if (isHidden(TaskSource.Package, name)) return null;

  const shellExec = new vscode.ShellExecution(`npm run ${name}`, { cwd });
  const task = new vscode.Task({ type: 'npm' }, folder, name, 'npm', shellExec);
  const displayName = useDisplayName && name.includes(':') ? name.split(':').slice(1).join(':') : name;

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
    treeTask.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
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
