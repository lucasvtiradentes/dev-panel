import {
  CONFIG_FILE_NAME,
  CONFIG_TASKS_ARRAY_PATTERN,
  PACKAGE_JSON,
  VSCODE_TASKS_PATH,
  getVscodeTasksFilePath,
} from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { PackageJsonHelper } from '../../../common/core/package-json-helper';
import { TaskSource } from '../../../common/schemas/types';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../../../common/utils/helpers/type-guards-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import { getExcludedDirs as getMakefileExcludedDirs } from '../../../views/tasks/makefile-tasks';
import { getExcludedDirs as getPackageExcludedDirs } from '../../../views/tasks/package-json';
import { getCurrentSource } from '../../../views/tasks/state';

async function handleOpenTasksConfig() {
  const source = getCurrentSource();
  const workspace = VscodeHelper.getFirstWorkspaceFolder();
  if (!workspace) return;

  const workspacePath = workspace.uri.fsPath;

  switch (source) {
    case TaskSource.VSCode: {
      const tasksJsonPath = getVscodeTasksFilePath(workspacePath);
      if (FileIOHelper.fileExists(tasksJsonPath)) {
        const uri = VscodeHelper.createFileUri(tasksJsonPath);
        await VscodeHelper.openDocument(uri);
      } else {
        void VscodeHelper.showToastMessage(ToastKind.Error, `${VSCODE_TASKS_PATH} not found`);
      }
      break;
    }

    case TaskSource.DevPanel: {
      const configPath = ConfigManager.getWorkspaceConfigFilePath(workspace, CONFIG_FILE_NAME);
      if (FileIOHelper.fileExists(configPath)) {
        const content = FileIOHelper.readFile(configPath);
        const lines = content.split('\n');
        let tasksLine = 0;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(CONFIG_TASKS_ARRAY_PATTERN)) {
            tasksLine = i;
            break;
          }
        }

        const uri = VscodeHelper.createFileUri(configPath);
        await VscodeHelper.openDocumentAtLine(uri, tasksLine);
      } else {
        const configDirLabel = ConfigManager.getConfigDirLabel(ConfigManager.getCurrentConfigDir());
        void VscodeHelper.showToastMessage(ToastKind.Error, `${configDirLabel}/${CONFIG_FILE_NAME} not found`);
      }
      break;
    }

    case TaskSource.Package: {
      const excludedDirs = getPackageExcludedDirs();
      const packageJsons = await PackageJsonHelper.findAllPackageJsons(workspace, excludedDirs);

      if (!TypeGuardsHelper.isNonEmptyArray(packageJsons)) {
        void VscodeHelper.showToastMessage(ToastKind.Error, `No ${PACKAGE_JSON} found`);
      } else if (packageJsons.length === 1) {
        await PackageJsonHelper.openPackageJsonAtScripts(packageJsons[0]);
      } else {
        const items = packageJsons.map((pkgPath) => ({
          label: NodePathHelper.relative(workspacePath, pkgPath),
          path: pkgPath,
        }));

        const selected = await VscodeHelper.showQuickPickItems(items, {
          placeHolder: `Select ${PACKAGE_JSON} to open`,
        });

        if (selected) {
          await PackageJsonHelper.openPackageJsonAtScripts(selected.path);
        }
      }
      break;
    }

    case TaskSource.Makefile: {
      const excludedDirs = getMakefileExcludedDirs();
      const makefiles = findMakefilesInWorkspace(workspacePath, excludedDirs);

      if (!TypeGuardsHelper.isNonEmptyArray(makefiles)) {
        void VscodeHelper.showToastMessage(ToastKind.Error, 'No Makefile found');
      } else if (makefiles.length === 1) {
        const uri = VscodeHelper.createFileUri(makefiles[0]);
        await VscodeHelper.openDocument(uri);
      } else {
        const items = makefiles.map((makefilePath) => ({
          label: NodePathHelper.relative(workspacePath, makefilePath),
          path: makefilePath,
        }));

        const selected = await VscodeHelper.showQuickPickItems(items, {
          placeHolder: 'Select Makefile to open',
        });

        if (selected) {
          const uri = VscodeHelper.createFileUri(selected.path);
          await VscodeHelper.openDocument(uri);
        }
      }
      break;
    }
  }
}

function findMakefilesInWorkspace(rootPath: string, excludedDirs: Set<string>): string[] {
  const results: string[] = [];
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

export function createOpenTasksConfigCommand() {
  return registerCommand(Command.OpenTasksConfig, handleOpenTasksConfig);
}
