import * as vscode from 'vscode';
import { BRANCH_FIELD_DESCRIPTION_MAX_LENGTH, CONTEXT_VALUES, getCommandId } from '../../common/constants';
import { Command } from '../../common/lib/vscode-utils';

export class BranchHeaderItem extends vscode.TreeItem {
  constructor(branchName: string) {
    super('Branch', vscode.TreeItemCollapsibleState.None);
    this.description = branchName;
    this.iconPath = new vscode.ThemeIcon('git-branch');
    this.contextValue = CONTEXT_VALUES.BRANCH_HEADER;
    this.tooltip = 'Click to switch branch';
    this.command = {
      command: 'git.checkout',
      title: 'Switch Branch',
    };
  }
}

export enum BranchContextField {
  PrLink = 'prLink',
  LinearLink = 'linearLink',
  Objective = 'objective',
  Notes = 'notes',
}

const FIELD_CONFIG: Record<BranchContextField, { label: string; icon: string; command: Command }> = {
  [BranchContextField.PrLink]: { label: 'PR Link', icon: 'git-pull-request', command: Command.EditBranchPrLink },
  [BranchContextField.LinearLink]: { label: 'Linear Link', icon: 'link', command: Command.EditBranchLinearLink },
  [BranchContextField.Objective]: { label: 'Objective', icon: 'target', command: Command.EditBranchObjective },
  [BranchContextField.Notes]: { label: 'Notes', icon: 'note', command: Command.EditBranchNotes },
};

export class BranchContextFieldItem extends vscode.TreeItem {
  constructor(
    public readonly fieldKey: BranchContextField,
    public readonly value: string | undefined,
    private readonly branchName: string,
  ) {
    const config = FIELD_CONFIG[fieldKey];
    super(config.label, vscode.TreeItemCollapsibleState.None);

    this.description = value ? truncate(value, BRANCH_FIELD_DESCRIPTION_MAX_LENGTH) : '(not set)';
    this.tooltip = value ?? `Click to set ${config.label.toLowerCase()}`;
    this.contextValue = CONTEXT_VALUES.BRANCH_CONTEXT_FIELD;
    this.iconPath = new vscode.ThemeIcon(config.icon);

    this.command = {
      command: getCommandId(config.command),
      title: `Edit ${config.label}`,
      arguments: [branchName, value],
    };
  }
}

function truncate(str: string, maxLen: number): string {
  const firstLine = str.split('\n')[0];
  if (firstLine.length <= maxLen) return firstLine;
  return `${firstLine.slice(0, maxLen - 3)}...`;
}
