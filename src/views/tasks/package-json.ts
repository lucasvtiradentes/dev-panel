import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  DEFAULT_EXCLUDED_DIRS,
  DIST_DIR_PREFIX,
  NO_GROUP_NAME,
  NPM_RUN_COMMAND,
  PACKAGE_JSON,
  getCommandId,
} from '../../common/constants';
import {
  getConfigFilePathFromWorkspacePath,
  getWorkspaceVariablesPath,
  loadConfigFromPath,
} from '../../common/lib/config-manager';
import { Command } from '../../common/lib/vscode-utils';
import { TaskSource } from '../../common/schemas/types';
import { readDevPanelVariablesAsEnv } from '../../common/utils/variables-env';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { WorkspaceFolder } from '../../common/vscode/vscode-types';
import { GroupTreeItem, TreeTask, type WorkspaceTreeItem } from './items';
import { isFavorite, isHidden } from './state';

type PackageJson = {
  scripts?: Record<string, string>;
};

type PackageLocation = {
  relativePath: string;
  absolutePath: string;
  scripts: Record<string, string>;
  folder: WorkspaceFolder;
};

function extractDirNamesFromGlobs(patterns: string[]): string[] {
  const dirs: string[] = [];
  for (const pattern of patterns) {
    const cleaned = pattern
      .replace(/\*\*\//g, '')
      .replace(/\/\*\*/g, '')
      .replace(/\*/g, '');
    if (cleaned && !cleaned.includes('/')) {
      dirs.push(cleaned);
    }
  }
  return dirs;
}

export function getExcludedDirs(workspacePath: string): Set<string> {
  const configPath = getConfigFilePathFromWorkspacePath(workspacePath, CONFIG_FILE_NAME);
  const excluded = new Set(DEFAULT_EXCLUDED_DIRS);

  const config = loadConfigFromPath(configPath);
  if (config) {
    const customExcludePatterns = config.settings?.exclude ?? [];
    const customDirs = extractDirNamesFromGlobs(customExcludePatterns);
    for (const dir of customDirs) {
      excluded.add(dir);
    }
  }

  return excluded;
}

export async function hasPackageGroups(): Promise<boolean> {
  const folders = VscodeHelper.getWorkspaceFolders();
  const allPackages: PackageLocation[] = [];

  for (const folder of folders) {
    const packages = await findAllPackageJsons(folder);
    allPackages.push(...packages);
  }

  if (allPackages.length === 0) return false;
  if (allPackages.length > 1) return true;

  const pkg = allPackages[0];
  const scriptNames = Object.keys(pkg.scripts);
  return scriptNames.some((name) => {
    if (name.includes(':')) return true;
    return scriptNames.some((other) => other.startsWith(`${name}:`));
  });
}

export async function getPackageScripts(
  grouped: boolean,
  showHidden: boolean,
  showOnlyFavorites: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
  const folders = VscodeHelper.getWorkspaceFolders();
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
      const task = createNpmTask({
        name,
        command,
        folder: pkg.folder,
        cwd: pkg.absolutePath,
        useDisplayName: false,
        showHidden,
        showOnlyFavorites,
      });
      if (task) taskElements.push(task);
    }
    return sortFn(taskElements);
  }

  if (isSinglePackage && grouped) {
    return getGroupedByScriptPrefix(allPackages[0], showHidden, showOnlyFavorites, sortFn);
  }

  return getGroupedByLocation(allPackages, showHidden, showOnlyFavorites, sortFn);
}

async function findAllPackageJsons(folder: WorkspaceFolder): Promise<PackageLocation[]> {
  const packages: PackageLocation[] = [];
  const rootPath = folder.uri.fsPath;
  const excludedDirs = getExcludedDirs(rootPath);

  const packageJsonPaths = findPackageJsonsRecursive(rootPath, excludedDirs);

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

function findPackageJsonsRecursive(dir: string, excludedDirs: Set<string>, maxDepth = 5, currentDepth = 0): string[] {
  if (currentDepth > maxDepth) return [];

  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === PACKAGE_JSON && entry.isFile()) {
        results.push(path.join(dir, entry.name));
      } else if (entry.isDirectory() && !excludedDirs.has(entry.name) && !entry.name.startsWith(DIST_DIR_PREFIX)) {
        results.push(
          ...findPackageJsonsRecursive(path.join(dir, entry.name), excludedDirs, maxDepth, currentDepth + 1),
        );
      }
    }
  } catch {
    // ignore permission errors
  }

  return results;
}

function getGroupedByLocation(
  packages: PackageLocation[],
  showHidden: boolean,
  showOnlyFavorites: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Array<TreeTask | GroupTreeItem | WorkspaceTreeItem> {
  const taskElements: Array<TreeTask | GroupTreeItem> = [];

  for (const pkg of packages) {
    const groupName = pkg.relativePath === 'root' ? 'root' : pkg.relativePath;
    const group = new GroupTreeItem(groupName);

    for (const [name, command] of Object.entries(pkg.scripts)) {
      const task = createNpmTask({
        name,
        command,
        folder: pkg.folder,
        cwd: pkg.absolutePath,
        useDisplayName: false,
        showHidden,
        showOnlyFavorites,
      });
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
  showHidden: boolean,
  showOnlyFavorites: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Array<TreeTask | GroupTreeItem | WorkspaceTreeItem> {
  const taskElements: Array<TreeTask | GroupTreeItem> = [];
  const groups: Record<string, GroupTreeItem> = {};
  const allScriptNames = Object.keys(pkg.scripts);

  for (const [name, command] of Object.entries(pkg.scripts)) {
    const treeTask = createNpmTask({
      name,
      command,
      folder: pkg.folder,
      cwd: pkg.absolutePath,
      useDisplayName: true,
      showHidden,
      showOnlyFavorites,
    });
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

function createNpmTask(options: {
  name: string;
  command: string;
  folder: WorkspaceFolder;
  cwd: string;
  useDisplayName: boolean;
  showHidden: boolean;
  showOnlyFavorites: boolean;
}): TreeTask | null {
  const { name, command, folder, cwd, useDisplayName, showHidden, showOnlyFavorites } = options;
  const hidden = isHidden(TaskSource.Package, name);
  const favorite = isFavorite(TaskSource.Package, name);
  if (hidden && !showHidden) return null;
  if (showOnlyFavorites && !favorite) return null;

  const variablesPath = getWorkspaceVariablesPath(folder);
  const env = readDevPanelVariablesAsEnv(variablesPath);
  const shellExec = VscodeHelper.createShellExecution(`${NPM_RUN_COMMAND} ${name}`, { cwd, env });
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

  if (hidden) {
    treeTask.iconPath = VscodeIcons.HiddenItem;
    treeTask.contextValue = CONTEXT_VALUES.TASK_HIDDEN;
  } else if (favorite) {
    treeTask.iconPath = VscodeIcons.FavoriteItem;
    treeTask.contextValue = CONTEXT_VALUES.TASK_FAVORITE;
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

  return NO_GROUP_NAME;
}
