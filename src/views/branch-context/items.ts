import * as vscode from 'vscode';
import {
  BRANCH_FIELD_DESCRIPTION_MAX_LENGTH,
  CONTEXT_VALUES,
  DESCRIPTION_NOT_SET,
  DESCRIPTION_NOT_SYNCED,
  getCommandId,
} from '../../common/constants';
import { Command } from '../../common/lib/vscode-utils';
import type { SectionMetadata } from '../../common/schemas/types';
import type { SectionDefinition } from './section-registry';

function truncate(str: string, maxLen: number): string {
  const firstLine = str.split('\n')[0];
  if (firstLine.length <= maxLen) return firstLine;
  return `${firstLine.slice(0, maxLen - 3)}...`;
}

function interpolateTemplate(template: string, metadata: SectionMetadata): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = metadata[key];
    return value !== undefined ? String(value) : '';
  });
}

export class SectionItem extends vscode.TreeItem {
  constructor(
    public readonly section: SectionDefinition,
    public readonly value: string | undefined,
    private readonly branchName: string,
    private readonly metadata?: SectionMetadata,
  ) {
    super(section.label, vscode.TreeItemCollapsibleState.None);

    this.contextValue = CONTEXT_VALUES.BRANCH_CONTEXT_FIELD;
    this.iconPath = new vscode.ThemeIcon(section.icon);

    if (section.type === 'auto') {
      this.description = this.getAutoDescription();
      this.tooltip = value ?? 'Auto-populated section. Click to view, use "Sync" to refresh.';
    } else {
      this.description = value ? truncate(value, BRANCH_FIELD_DESCRIPTION_MAX_LENGTH) : DESCRIPTION_NOT_SET;
      this.tooltip = value ?? `Click to set ${section.label.toLowerCase()}`;
    }

    if (section.command) {
      this.command = {
        command: getCommandId(section.command),
        title: `Edit ${section.label}`,
        arguments: [branchName, value],
      };
    } else {
      this.command = {
        command: getCommandId(Command.OpenBranchContextFileAtLine),
        title: `View ${section.label}`,
        arguments: [branchName, section.name],
      };
    }
  }

  private getAutoDescription(): string {
    if (!this.value) return DESCRIPTION_NOT_SYNCED;

    if (this.section.descriptionTemplate && this.metadata) {
      const formatted = interpolateTemplate(this.section.descriptionTemplate, this.metadata);
      if (formatted.trim()) return formatted;
    }

    return truncate(this.value, BRANCH_FIELD_DESCRIPTION_MAX_LENGTH);
  }
}
