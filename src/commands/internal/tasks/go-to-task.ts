import { CONFIG_FILE_NAME, PACKAGE_JSON, VSCODE_TASKS_PATH } from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { TaskSource } from '../../../common/schemas/types';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../../../common/utils/helpers/type-guards-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import { isMultiRootWorkspace } from '../../../common/vscode/vscode-workspace';
import type { TreeTask } from '../../../views/tasks';

export function createGoToTaskCommand() {
  return registerCommand(Command.GoToTask, async (task: TreeTask) => {
    if (isMultiRootWorkspace()) {
      VscodeHelper.showToastMessage(ToastKind.Error, 'Sorry, this feature is not available in multi-root workspaces');
      return;
    }

    const folders = VscodeHelper.getWorkspaceFolders();
    if (!TypeGuardsHelper.isNonEmptyArray(folders)) {
      VscodeHelper.showToastMessage(ToastKind.Error, 'No workspace folder found');
      return;
    }

    const workspacePath = folders[0].uri.fsPath;
    const taskName = task.taskName ?? (task.label as string);

    if (task.taskSource === TaskSource.DevPanel) {
      const configPath = ConfigManager.getConfigFilePathFromWorkspacePath(workspacePath, CONFIG_FILE_NAME);
      await openFileAtLabel(configPath, taskName);
      return;
    }

    if (task.taskSource === TaskSource.Package) {
      const packageJsonPath = NodePathHelper.join(workspacePath, PACKAGE_JSON);
      await openFileAtLabel(packageJsonPath, taskName);
      return;
    }

    if (task.taskSource === TaskSource.Makefile) {
      const makefilePath = await findMakefileWithTarget(workspacePath, taskName);
      if (makefilePath) {
        await openFileAtLabel(makefilePath, `${taskName}:`);
      } else {
        VscodeHelper.showToastMessage(ToastKind.Error, `Makefile with target '${taskName}' not found`);
      }
      return;
    }

    const tasksFilePath = NodePathHelper.join(workspacePath, VSCODE_TASKS_PATH);
    await openFileAtLabel(tasksFilePath, taskName);
  });
}

async function openFileAtLabel(filePath: string, label: string) {
  if (!FileIOHelper.fileExists(filePath)) {
    VscodeHelper.showToastMessage(ToastKind.Error, `File not found: ${filePath}`);
    return;
  }

  const fileUri = VscodeHelper.createFileUri(filePath);
  const fileContent = FileIOHelper.readFile(filePath);
  const lines = fileContent.split('\n');

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    if (lines[lineNumber].includes(label)) {
      await VscodeHelper.openDocumentAtLine(fileUri, lineNumber);
      return;
    }
  }

  await VscodeHelper.openDocument(fileUri);
}

async function findMakefileWithTarget(rootPath: string, targetName: string): Promise<string | null> {
  const makefiles = findAllMakefiles(rootPath);

  for (const makefilePath of makefiles) {
    if (makefileHasTarget(makefilePath, targetName)) {
      return makefilePath;
    }
  }

  return null;
}

function findAllMakefiles(rootPath: string): string[] {
  const results: string[] = [];
  const excludedDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
  findMakefilesRecursive(rootPath, excludedDirs, results);
  return results;
}

function findMakefilesRecursive(
  dir: string,
  excludedDirs: Set<string>,
  results: string[],
  maxDepth = 5,
  currentDepth = 0,
): void {
  if (currentDepth > maxDepth) return;

  try {
    const entries = FileIOHelper.readDirectory(dir, { withFileTypes: true });

    for (const entry of entries) {
      if ((entry.name === 'Makefile' || entry.name === 'makefile') && entry.isFile()) {
        results.push(NodePathHelper.join(dir, entry.name));
      } else if (entry.isDirectory() && !excludedDirs.has(entry.name) && !entry.name.startsWith('dist-')) {
        findMakefilesRecursive(NodePathHelper.join(dir, entry.name), excludedDirs, results, maxDepth, currentDepth + 1);
      }
    }
  } catch {
    // ignore permission errors
  }
}

function makefileHasTarget(makefilePath: string, targetName: string): boolean {
  try {
    const content = FileIOHelper.readFile(makefilePath, 'utf8');
    const targetPattern = new RegExp(`^${targetName}:`, 'm');
    return targetPattern.test(content);
  } catch {
    return false;
  }
}
