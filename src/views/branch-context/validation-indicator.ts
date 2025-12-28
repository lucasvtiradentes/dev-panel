import { getCommandId } from '../../common/constants';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeConstants, VscodeIcon } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { StatusBarItem } from '../../common/vscode/vscode-types';
import { type ValidationIssue, ValidationSeverity } from './config-validator';

export class ValidationIndicator {
  private statusBarItem: StatusBarItem;

  constructor() {
    this.statusBarItem = VscodeHelper.createStatusBarItem(VscodeConstants.StatusBarAlignment.Left, 100);
  }

  show(issues: ValidationIssue[]) {
    if (issues.length === 0) {
      this.hide();
      return;
    }

    const errorCount = issues.filter((i) => i.severity === ValidationSeverity.Error).length;
    const warningCount = issues.filter((i) => i.severity === ValidationSeverity.Warning).length;

    this.statusBarItem.text =
      errorCount > 0
        ? `$(${VscodeIcon.Error}) Branch Context (${errorCount} errors)`
        : `$(${VscodeIcon.Warning}) Branch Context (${warningCount} warnings)`;

    const tooltip = VscodeHelper.createMarkdownString();
    tooltip.appendMarkdown('### Branch Context Validation Issues\n\n');

    for (const issue of issues) {
      const icon = issue.severity === ValidationSeverity.Error ? `$(${VscodeIcon.Error})` : `$(${VscodeIcon.Warning})`;
      tooltip.appendMarkdown(`${icon} **${issue.section}**: ${issue.message}\n\n`);
    }

    tooltip.appendMarkdown('\n*Click to view details*');

    this.statusBarItem.tooltip = tooltip;
    this.statusBarItem.command = getCommandId(Command.ShowBranchContextValidation);
    this.statusBarItem.show();
  }

  hide() {
    this.statusBarItem.hide();
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}
