import {
  CONFIG_FILE_NAME,
  CONFIG_TASKS_ARRAY_PATTERN,
  DIST_DIR_PREFIX,
  PACKAGE_JSON,
  PACKAGE_JSON_SCRIPTS_PATTERN,
  VSCODE_TASKS_PATH,
  getVscodeTasksFilePath,
} from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import { FileIOHelper, NodePathHelper } from '../../../common/lib/node-helper';
import { TaskSource } from '../../../common/schemas/types';
import { TypeGuards } from '../../../common/utils/common-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { WorkspaceFolder } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import { getFirstWorkspaceFolder } from '../../../common/vscode/workspace-utils';
import { getExcludedDirs } from '../../../views/tasks/package-json';
import { getCurrentSource } from '../../../views/tasks/state';

async function findAllPackageJsons(folder: WorkspaceFolder): Promise<string[]> {
  const packageJsons: string[] = [];
  const excludedDirs = getExcludedDirs(folder.uri.fsPath);

  async function scan(dir: string) {
    const entries = FileIOHelper.readDirectory(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (excludedDirs.has(entry.name) || entry.name.startsWith(DIST_DIR_PREFIX)) continue;

      const fullPath = NodePathHelper.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.name === PACKAGE_JSON) {
        packageJsons.push(fullPath);
      }
    }
  }

  await scan(folder.uri.fsPath);
  return packageJsons;
}

async function openPackageJsonAtScripts(packageJsonPath: string) {
  const content = FileIOHelper.readFile(packageJsonPath);
  const lines = content.split('\n');
  let scriptsLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(PACKAGE_JSON_SCRIPTS_PATTERN)) {
      scriptsLine = i;
      break;
    }
  }

  const uri = VscodeHelper.createFileUri(packageJsonPath);
  await VscodeHelper.openDocumentAtLine(uri, scriptsLine);
}

export function createOpenTasksConfigCommand() {
  return registerCommand(Command.OpenTasksConfig, async () => {
    const source = getCurrentSource();
    const workspace = getFirstWorkspaceFolder();
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
        const packageJsons = await findAllPackageJsons(workspace);

        if (!TypeGuards.isNonEmptyArray(packageJsons)) {
          void VscodeHelper.showToastMessage(ToastKind.Error, `No ${PACKAGE_JSON} found`);
        } else if (packageJsons.length === 1) {
          await openPackageJsonAtScripts(packageJsons[0]);
        } else {
          const items = packageJsons.map((pkgPath) => ({
            label: NodePathHelper.relative(workspacePath, pkgPath),
            path: pkgPath,
          }));

          const selected = await VscodeHelper.showQuickPickItems(items, {
            placeHolder: `Select ${PACKAGE_JSON} to open`,
          });

          if (selected) {
            await openPackageJsonAtScripts(selected.path);
          }
        }
        break;
      }
    }
  });
}
