import {
  CONFIG_FILE_NAME,
  CONFIG_TASKS_ARRAY_PATTERN,
  PACKAGE_JSON,
  VSCODE_TASKS_PATH,
  getVscodeTasksFilePath,
} from '../../../common/constants';
import { FileIOHelper, NodePathHelper } from '../../../common/lib/node-helper';
import { TaskSource } from '../../../common/schemas/types';
import { TypeGuards } from '../../../common/utils/common-utils';
import { ConfigManager } from '../../../common/utils/config-manager';
import { FileOperations } from '../../../common/utils/file-operations';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import { getFirstWorkspaceFolder } from '../../../common/vscode/workspace-utils';
import { getExcludedDirs } from '../../../views/tasks/package-json';
import { getCurrentSource } from '../../../views/tasks/state';

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
        const excludedDirs = getExcludedDirs(workspace.uri.fsPath);
        const packageJsons = await FileOperations.findAllPackageJsons(workspace, excludedDirs);

        if (!TypeGuards.isNonEmptyArray(packageJsons)) {
          void VscodeHelper.showToastMessage(ToastKind.Error, `No ${PACKAGE_JSON} found`);
        } else if (packageJsons.length === 1) {
          await FileOperations.openPackageJsonAtScripts(packageJsons[0]);
        } else {
          const items = packageJsons.map((pkgPath) => ({
            label: NodePathHelper.relative(workspacePath, pkgPath),
            path: pkgPath,
          }));

          const selected = await VscodeHelper.showQuickPickItems(items, {
            placeHolder: `Select ${PACKAGE_JSON} to open`,
          });

          if (selected) {
            await FileOperations.openPackageJsonAtScripts(selected.path);
          }
        }
        break;
      }
    }
  });
}
