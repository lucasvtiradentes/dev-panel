import * as vscode from 'vscode';
import { getCommandId } from '../../common/constants';
import { Command } from '../../common/lib/vscode-utils';
import type { ValidationIssue } from './config-validator';

export class ValidationIndicator {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  }

  show(issues: ValidationIssue[]) {
    if (issues.length === 0) {
      this.hide();
      return;
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    this.statusBarItem.text =
      errorCount > 0
        ? `$(error) Branch Context (${errorCount} errors)`
        : `$(warning) Branch Context (${warningCount} warnings)`;

    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown('### Branch Context Validation Issues\n\n');

    for (const issue of issues) {
      const icon = issue.severity === 'error' ? '$(error)' : '$(warning)';
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
