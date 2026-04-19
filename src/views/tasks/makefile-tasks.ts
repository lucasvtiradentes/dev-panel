import { VariablesEnvManager } from 'src/common/core/variables-env-manager';
import {
  CONTEXT_VALUES,
  DEFAULT_EXCLUDED_DIRS,
  DIST_DIR_PREFIX,
  NO_GROUP_NAME,
  ROOT_PACKAGE_LABEL,
  getCommandId,
} from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { TaskSource } from '../../common/schemas/types';
import { FileIOHelper, NodePathHelper } from '../../common/utils/helpers/node-helper';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { WorkspaceFolder } from '../../common/vscode/vscode-types';
import { GroupTreeItem, TreeTask, type WorkspaceTreeItem } from './items';
import { buildTaskStateKey, isFavorite, isHidden } from './state';

type MakefileLocation = {
  relativePath: string;
  absolutePath: string;
  targets: Map<string, string>;
  folder: WorkspaceFolder;
};

function getExcludedDirs(extraIgnore?: string[]): Set<string> {
  const dirs = new Set(DEFAULT_EXCLUDED_DIRS);
  if (extraIgnore) {
    for (const dir of extraIgnore) dirs.add(dir);
  }
  return dirs;
}

export function resolveMakefilePath(dir: string): string | null {
  const makefilePath = NodePathHelper.join(dir, 'Makefile');
  if (FileIOHelper.fileExists(makefilePath)) return makefilePath;
  const makefileLowerPath = NodePathHelper.join(dir, 'makefile');
  if (FileIOHelper.fileExists(makefileLowerPath)) return makefileLowerPath;
  return null;
}

export function hasMakefileSourceFiles(): boolean {
  const folders = VscodeHelper.getWorkspaceFolders();
  return folders.some((folder) => resolveMakefilePath(folder.uri.fsPath) !== null);
}

export async function hasMakefileGroups(): Promise<boolean> {
  const folders = VscodeHelper.getWorkspaceFolders();
  const allMakefiles: MakefileLocation[] = [];

  for (const folder of folders) {
    const makefiles = await findAllMakefiles(folder);
    allMakefiles.push(...makefiles);
  }

  if (allMakefiles.length === 0) return false;
  if (allMakefiles.length > 1) return true;

  const makefile = allMakefiles[0];
  const targetNames = Array.from(makefile.targets.keys());
  return targetNames.some((name) => {
    if (name.includes(':')) return true;
    return targetNames.some((other) => other.startsWith(`${name}:`));
  });
}

export async function getMakefileTasks(
  grouped: boolean,
  showHidden: boolean,
  showOnlyFavorites: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Promise<Array<TreeTask | GroupTreeItem | WorkspaceTreeItem>> {
  const folders = VscodeHelper.getWorkspaceFolders();
  const allMakefiles: MakefileLocation[] = [];

  for (const folder of folders) {
    const makefiles = await findAllMakefiles(folder);
    allMakefiles.push(...makefiles);
  }

  if (allMakefiles.length === 0) {
    return [];
  }

  const isSingleMakefile = allMakefiles.length === 1 && allMakefiles[0].relativePath === ROOT_PACKAGE_LABEL;

  if (isSingleMakefile && !grouped) {
    const makefile = allMakefiles[0];
    const taskElements: TreeTask[] = [];
    for (const [name, description] of makefile.targets) {
      const task = createMakeTask({
        name,
        description,
        folder: makefile.folder,
        cwd: makefile.absolutePath,
        relativePath: makefile.relativePath,
        useDisplayName: false,
        showHidden,
        showOnlyFavorites,
      });
      if (task) taskElements.push(task);
    }
    return sortFn(taskElements);
  }

  if (isSingleMakefile && grouped) {
    return getGroupedByTargetPrefix(allMakefiles[0], showHidden, showOnlyFavorites, sortFn);
  }

  return getGroupedByLocation(allMakefiles, showHidden, showOnlyFavorites, sortFn);
}

async function findAllMakefiles(folder: WorkspaceFolder): Promise<MakefileLocation[]> {
  const makefiles: MakefileLocation[] = [];
  const rootPath = folder.uri.fsPath;
  const config = ConfigManager.loadWorkspaceConfig(folder);
  const excludedDirs = getExcludedDirs(config?.taskScanIgnorePaths);

  const makefilePaths = findMakefilesRecursive(rootPath, excludedDirs);

  for (const makefilePath of makefilePaths) {
    const targets = readMakefileTargets(makefilePath);
    if (targets.size === 0) continue;

    const makefileDir = NodePathHelper.dirname(makefilePath);
    const relativePath = NodePathHelper.relative(rootPath, makefileDir) || ROOT_PACKAGE_LABEL;

    makefiles.push({
      relativePath,
      absolutePath: makefileDir,
      targets,
      folder,
    });
  }

  makefiles.sort((a, b) => {
    if (a.relativePath === ROOT_PACKAGE_LABEL) return -1;
    if (b.relativePath === ROOT_PACKAGE_LABEL) return 1;
    return a.relativePath.localeCompare(b.relativePath);
  });

  return makefiles;
}

function findMakefilesRecursive(dir: string, excludedDirs: Set<string>, maxDepth = 5, currentDepth = 0): string[] {
  if (currentDepth > maxDepth) return [];

  const results: string[] = [];

  try {
    const entries = FileIOHelper.readDirectory(dir, { withFileTypes: true });

    for (const entry of entries) {
      if ((entry.name === 'Makefile' || entry.name === 'makefile') && entry.isFile()) {
        results.push(NodePathHelper.join(dir, entry.name));
      } else if (entry.isDirectory() && !excludedDirs.has(entry.name) && !entry.name.startsWith(DIST_DIR_PREFIX)) {
        results.push(
          ...findMakefilesRecursive(NodePathHelper.join(dir, entry.name), excludedDirs, maxDepth, currentDepth + 1),
        );
      }
    }
  } catch {
    // ignore permission errors
  }

  return results;
}

function getGroupedByLocation(
  makefiles: MakefileLocation[],
  showHidden: boolean,
  showOnlyFavorites: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Array<TreeTask | GroupTreeItem | WorkspaceTreeItem> {
  const taskElements: Array<TreeTask | GroupTreeItem> = [];

  for (const makefile of makefiles) {
    const groupName = makefile.relativePath === ROOT_PACKAGE_LABEL ? ROOT_PACKAGE_LABEL : makefile.relativePath;
    const group = new GroupTreeItem(groupName);

    for (const [name, description] of makefile.targets) {
      const task = createMakeTask({
        name,
        description,
        folder: makefile.folder,
        cwd: makefile.absolutePath,
        relativePath: makefile.relativePath,
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

function getGroupedByTargetPrefix(
  makefile: MakefileLocation,
  showHidden: boolean,
  showOnlyFavorites: boolean,
  sortFn: (
    elements: Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
  ) => Array<WorkspaceTreeItem | GroupTreeItem | TreeTask>,
): Array<TreeTask | GroupTreeItem | WorkspaceTreeItem> {
  const taskElements: Array<TreeTask | GroupTreeItem> = [];
  const groups: Record<string, GroupTreeItem> = {};
  const allTargetNames = Array.from(makefile.targets.keys());

  for (const [name, description] of makefile.targets) {
    const treeTask = createMakeTask({
      name,
      description,
      folder: makefile.folder,
      cwd: makefile.absolutePath,
      relativePath: makefile.relativePath,
      useDisplayName: true,
      showHidden,
      showOnlyFavorites,
    });
    if (!treeTask) continue;

    const groupName = extractGroupName(name, allTargetNames);

    if (!groups[groupName]) {
      groups[groupName] = new GroupTreeItem(groupName);
      taskElements.push(groups[groupName]);
    }
    groups[groupName].children.push(treeTask);
  }

  return sortFn(taskElements);
}

function readMakefileTargets(makefilePath: string): Map<string, string> {
  const targets = new Map<string, string>();

  try {
    const content = FileIOHelper.readFile(makefilePath);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines, comments, and special targets
      if (!line || line.startsWith('#') || line.startsWith('.')) continue;

      // Match target pattern: target-name: dependencies
      const targetMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (targetMatch) {
        const targetName = targetMatch[1];
        const dependencies = targetMatch[2];

        // Skip if it's a variable assignment
        if (!line.includes('=') || line.indexOf(':') < line.indexOf('=')) {
          targets.set(targetName, dependencies || '');
        }
      }
    }
  } catch {
    // ignore file read errors
  }

  return targets;
}

function createMakeTask(options: {
  name: string;
  description: string;
  folder: WorkspaceFolder;
  cwd: string;
  relativePath: string;
  useDisplayName: boolean;
  showHidden: boolean;
  showOnlyFavorites: boolean;
}): TreeTask | null {
  const { name, description, folder, cwd, relativePath, useDisplayName, showHidden, showOnlyFavorites } = options;
  const stateKey = buildTaskStateKey(folder.name, relativePath, name);
  const hidden = isHidden(TaskSource.Makefile, stateKey);
  const favorite = isFavorite(TaskSource.Makefile, stateKey);
  if (hidden && !showHidden) return null;
  if (showOnlyFavorites && !favorite) return null;

  const variablesPath = ConfigManager.getWorkspaceVariablesPath(folder);
  const customEnv = VariablesEnvManager.readDevPanelVariablesAsEnv(variablesPath);
  const env = VariablesEnvManager.withProcessEnv(customEnv);
  const shellExec = VscodeHelper.createShellExecution(`make ${name}`, { cwd, env });
  const task = VscodeHelper.createTask({
    definition: { type: 'make' },
    scope: folder,
    name,
    source: 'make',
    execution: shellExec,
  });
  const displayName = useDisplayName && name.includes(':') ? name.split(':').slice(1).join(':') : name;

  const treeTask = new TreeTask(
    'make',
    displayName,
    VscodeConstants.TreeItemCollapsibleState.None,
    {
      command: getCommandId(Command.ExecuteTask),
      title: 'Execute',
      arguments: [task, folder],
    },
    folder,
  );
  treeTask.taskName = name;
  treeTask.stateKey = stateKey;
  treeTask.taskSource = TaskSource.Makefile;
  treeTask.tooltip = description || `make ${name}`;

  if (hidden) {
    treeTask.iconPath = VscodeIcons.HiddenItem;
    treeTask.contextValue = CONTEXT_VALUES.TASK_HIDDEN;
  } else if (favorite) {
    treeTask.iconPath = VscodeIcons.FavoriteItem;
    treeTask.contextValue = CONTEXT_VALUES.TASK_FAVORITE;
  }

  return treeTask;
}

function extractGroupName(targetName: string, allTargetNames: string[]): string {
  if (targetName.includes(':')) {
    return targetName.split(':')[0];
  }

  const hasRelatedTargets = allTargetNames.some((name) => name.startsWith(`${targetName}:`));
  if (hasRelatedTargets) {
    return targetName;
  }

  return NO_GROUP_NAME;
}
