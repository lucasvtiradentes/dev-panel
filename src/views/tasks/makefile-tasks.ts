import { VariablesEnvManager } from 'src/common/core/variables-env-manager';
import { CONTEXT_VALUES, ROOT_PACKAGE_LABEL, getCommandId } from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { TaskSource } from '../../common/schemas/types';
import { tasksState } from '../../common/state';
import { FileIOHelper, NodePathHelper } from '../../common/utils/helpers/node-helper';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { WorkspaceFolder } from '../../common/vscode/vscode-types';
import { buildPrefixGroupTree } from './group-by-prefix';
import { GroupTreeItem, TreeTask, type WorkspaceTreeItem } from './items';
import { buildTaskStateKey, isFavorite, isHidden } from './state';
import { findTaskSourceFiles } from './task-source-scanner';

type MakefileLocation = {
  relativePath: string;
  absolutePath: string;
  targets: Map<string, string>;
  folder: WorkspaceFolder;
};

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

export function hasMultipleMakefileConfigEntries(): boolean {
  return VscodeHelper.getWorkspaceFolders().some((folder) => {
    const rootPath = folder.uri.fsPath;
    return findTaskSourceFiles(rootPath, ['Makefile', 'makefile'], tasksState.getTaskScanIgnorePaths()).length > 1;
  });
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
        displayName: name,
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
  const makefilePaths = findTaskSourceFiles(rootPath, ['Makefile', 'makefile'], tasksState.getTaskScanIgnorePaths());

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
        displayName: name,
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
  const taskElements = buildPrefixGroupTree(
    makefile.targets.entries(),
    Array.from(makefile.targets.keys()),
    (name, description, displayName) =>
      createMakeTask({
        name,
        description,
        folder: makefile.folder,
        cwd: makefile.absolutePath,
        relativePath: makefile.relativePath,
        displayName,
        showHidden,
        showOnlyFavorites,
      }),
  );

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

function getMakeTaskName(relativePath: string, name: string): string {
  if (relativePath === ROOT_PACKAGE_LABEL) return name;
  return `${name} - ${relativePath}`;
}

function createMakeTask(options: {
  name: string;
  description: string;
  folder: WorkspaceFolder;
  cwd: string;
  relativePath: string;
  displayName: string;
  showHidden: boolean;
  showOnlyFavorites: boolean;
}): TreeTask | null {
  const { name, description, folder, cwd, relativePath, displayName, showHidden, showOnlyFavorites } = options;
  const stateKey = buildTaskStateKey(folder.name, relativePath, name);
  const hidden = isHidden(TaskSource.Makefile, stateKey);
  const favorite = isFavorite(TaskSource.Makefile, stateKey);
  if (hidden && !showHidden) return null;
  if (showOnlyFavorites && !favorite) return null;

  const variablesPath = ConfigManager.getWorkspaceVariablesPath(folder);
  const customEnv = VariablesEnvManager.readDevPanelVariablesAsEnv(variablesPath);
  const env = VariablesEnvManager.withProcessEnv(customEnv);
  const shellExec = VscodeHelper.createShellExecution(`make ${name}`, { cwd, env });
  const taskName = getMakeTaskName(relativePath, name);
  const task = VscodeHelper.createTask({
    definition: { type: 'make', task: taskName },
    scope: folder,
    name: taskName,
    source: 'make',
    execution: shellExec,
  });

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
