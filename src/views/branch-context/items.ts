import * as vscode from 'vscode';
import { getCommandId } from '../../common/constants';
import { Command } from '../../common/lib/vscode-utils';

export class BranchHeaderItem extends vscode.TreeItem {
  constructor(branchName: string) {
    super(`Branch: ${branchName}`, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('git-branch');
    this.contextValue = 'branchHeader';
  }
}

type BranchContextField = 'objective' | 'linearIssue' | 'notes';

export class BranchContextFieldItem extends vscode.TreeItem {
  constructor(
    public readonly fieldKey: BranchContextField,
    public readonly value: string | undefined,
    private readonly branchName: string,
  ) {
    const label = fieldKey === 'linearIssue' ? 'Linear Issue' : fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1);
    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = value ?? '(not set)';
    this.tooltip = value ?? `Click to set ${label.toLowerCase()}`;
    this.contextValue = 'branchContextField';

    const iconMap: Record<BranchContextField, string> = {
      objective: 'target',
      linearIssue: 'issues',
      notes: 'note',
    };
    this.iconPath = new vscode.ThemeIcon(iconMap[fieldKey]);

    const commandMap: Record<BranchContextField, Command> = {
      objective: Command.EditBranchObjective,
      linearIssue: Command.EditBranchLinearIssue,
      notes: Command.EditBranchNotes,
    };

    this.command = {
      command: getCommandId(commandMap[fieldKey]),
      title: `Edit ${label}`,
      arguments: [branchName, value],
    };
  }
}
