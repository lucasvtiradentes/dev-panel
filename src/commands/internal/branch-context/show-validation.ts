import { CONFIG_FILE_NAME } from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import { FileIOHelper } from '../../../common/utils/file-io';
import { getFirstWorkspacePath } from '../../../common/utils/workspace-utils';
import { VscodeConstants } from '../../../common/vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-utils';
import { validateBranchContext } from '../../../views/branch-context/config-validator';

export function createShowBranchContextValidationCommand(): Disposable {
  return registerCommand(Command.ShowBranchContextValidation, async () => {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const configPath = ConfigManager.getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!FileIOHelper.fileExists(configPath)) {
      await VscodeHelper.showToastMessage(ToastKind.Info, 'No config file found');
      return;
    }

    const configContent = FileIOHelper.readFile(configPath);
    const config = ConfigManager.parseConfig(configContent);
    if (!config) {
      await VscodeHelper.showToastMessage(ToastKind.Error, 'Failed to parse config file');
      return;
    }
    const issues = validateBranchContext(workspace, config.branchContext);

    if (issues.length === 0) {
      await VscodeHelper.showToastMessage(ToastKind.Info, 'No validation issues found');
      return;
    }

    const items = issues.map((issue) => ({
      label: issue.section,
      description: issue.message,
      detail: `Severity: ${issue.severity}`,
      issue,
    }));

    const selected = await VscodeHelper.showQuickPickItems(items, {
      placeHolder: 'Select an issue to view details',
    });

    if (selected) {
      const configUri = VscodeHelper.createFileUri(configPath);
      const templatePath = ConfigManager.getBranchContextTemplatePath(workspace);
      const templateUri = VscodeHelper.createFileUri(templatePath);

      await executeCommand(Command.VscodeOpen, { uri: configUri, viewColumn: VscodeConstants.ViewColumn.One });
      await executeCommand(Command.VscodeOpen, { uri: templateUri, viewColumn: VscodeConstants.ViewColumn.Two });
    }
  });
}
