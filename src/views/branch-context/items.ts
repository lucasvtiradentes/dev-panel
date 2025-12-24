import * as vscode from 'vscode';
import { BRANCH_FIELD_DESCRIPTION_MAX_LENGTH, CONTEXT_VALUES, getCommandId } from '../../common/constants';
import { Command } from '../../common/lib/vscode-utils';
import type { SectionDefinition } from './section-registry';

function truncate(str: string, maxLen: number): string {
  const firstLine = str.split('\n')[0];
  if (firstLine.length <= maxLen) return firstLine;
  return `${firstLine.slice(0, maxLen - 3)}...`;
}

export class SectionItem extends vscode.TreeItem {
  constructor(
    public readonly section: SectionDefinition,
    public readonly value: string | undefined,
    private readonly branchName: string,
  ) {
    super(section.label, vscode.TreeItemCollapsibleState.None);

    this.iconPath = new vscode.ThemeIcon(section.icon);
    this.contextValue = CONTEXT_VALUES.BRANCH_CONTEXT_FIELD;

    if (section.type === 'auto') {
      this.description = value ? truncate(value, BRANCH_FIELD_DESCRIPTION_MAX_LENGTH) : '(not synced)';
      this.tooltip = 'Auto-populated section. Click "Sync" to refresh.';
    } else {
      this.description = value ? truncate(value, BRANCH_FIELD_DESCRIPTION_MAX_LENGTH) : '(not set)';
      this.tooltip = value ?? `Click to set ${section.label.toLowerCase()}`;

      if (section.command) {
        this.command = {
          command: getCommandId(section.command),
          title: `Edit ${section.label}`,
          arguments: [branchName, value],
        };
      } else {
        this.command = {
          command: getCommandId(Command.OpenBranchContextFileAtLine),
          title: `Edit ${section.label}`,
          arguments: [branchName, section.name],
        };
      }
    }
  }
}
