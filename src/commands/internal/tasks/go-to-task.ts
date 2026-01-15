import {
  CONFIG_DIR_KEY,
  CONFIG_FILE_NAME,
  GLOBAL_TASK_TYPE,
  PACKAGE_JSON,
  VSCODE_TASKS_PATH,
  getGlobalConfigPath,
} from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
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

    if (task.type === GLOBAL_TASK_TYPE) {
      const globalConfigPath = getGlobalConfigPath();
      await openFileAtLabel(globalConfigPath, taskName);
      return;
    }

    if (task.type === CONFIG_DIR_KEY) {
      const configPath = ConfigManager.getConfigFilePathFromWorkspacePath(workspacePath, CONFIG_FILE_NAME);
      await openFileAtLabel(configPath, taskName);
      return;
    }

    if (task.type === 'npm') {
      const packageJsonPath = NodePathHelper.join(workspacePath, PACKAGE_JSON);
      await openFileAtLabel(packageJsonPath, taskName);
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
