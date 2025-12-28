import { CONFIG_FILE_NAME } from '../../../common/constants';
import { BranchContextError, BranchContextMarkdownHelper } from '../../../common/core/branch-context-markdown';
import { ConfigManager } from '../../../common/core/config-manager';
import { Command, executeCommand, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeConstants } from '../../../common/vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { validateBranchContext } from '../../../views/branch-context/config-validator';

async function handleShowValidation() {
  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) return;

  const result = BranchContextMarkdownHelper.getValidationIssues(workspace, validateBranchContext);

  if (!result.success) {
    const message =
      result.error === BranchContextError.NoConfig ? 'No config file found' : 'Failed to parse config file';
    const kind = result.error === BranchContextError.NoConfig ? ToastKind.Info : ToastKind.Error;
    await VscodeHelper.showToastMessage(kind, message);
    return;
  }

  if (result.issues.length === 0) {
    await VscodeHelper.showToastMessage(ToastKind.Info, 'No validation issues found');
    return;
  }

  const items = result.issues.map((issue) => ({
    label: issue.section,
    description: issue.message,
    detail: `Severity: ${issue.severity}`,
    issue,
  }));

  const selected = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: 'Select an issue to view details',
  });

  if (selected) {
    const configPath = ConfigManager.getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    const configUri = VscodeHelper.createFileUri(configPath);
    const templatePath = ConfigManager.getBranchContextTemplatePath(workspace);
    const templateUri = VscodeHelper.createFileUri(templatePath);

    await executeCommand(Command.VscodeOpen, { uri: configUri, viewColumn: VscodeConstants.ViewColumn.One });
    await executeCommand(Command.VscodeOpen, { uri: templateUri, viewColumn: VscodeConstants.ViewColumn.Two });
  }
}

export function createShowBranchContextValidationCommand(): Disposable {
  return registerCommand(Command.ShowBranchContextValidation, handleShowValidation);
}
