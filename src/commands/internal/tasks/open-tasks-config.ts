import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  CONFIG_TASKS_ARRAY_PATTERN,
  PACKAGE_JSON,
  VSCODE_TASKS_PATH,
  getVscodeTasksFilePath,
} from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import { PackageJsonHelper } from '../../../common/core/package-json-helper';
import { TaskSource } from '../../../common/schemas/types';
import { tasksState } from '../../../common/state';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../../../common/utils/helpers/type-guards-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import { resolveMakefilePath } from '../../../views/tasks/makefile-tasks';
import { getCurrentSource } from '../../../views/tasks/state';
import { findTaskSourceFiles } from '../../../views/tasks/task-source-scanner';

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
        void VscodeHelper.showToastMessage(ToastKind.Error, `${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME} not found`);
      }
      break;
    }

    case TaskSource.Package: {
      const packageJsons = findTaskSourceFiles(workspacePath, [PACKAGE_JSON], tasksState.getTaskScanIgnorePaths());

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
      const resolvedPath = resolveMakefilePath(workspacePath);

      if (resolvedPath) {
        const uri = VscodeHelper.createFileUri(resolvedPath);
        await VscodeHelper.openDocument(uri);
      } else {
        void VscodeHelper.showToastMessage(ToastKind.Error, 'Makefile not found');
      }
      break;
    }
  }
}

export function createOpenTasksConfigCommand() {
  return registerCommand(Command.OpenTasksConfig, handleOpenTasksConfig);
}
