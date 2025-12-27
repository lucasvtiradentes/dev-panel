import {
  BRANCH_FIELD_DESCRIPTION_MAX_LENGTH,
  CONTEXT_VALUES,
  DESCRIPTION_NOT_SET,
  DESCRIPTION_NOT_SYNCED,
  METADATA_FIELD_DESCRIPTION,
  SECTION_NAME_BRANCH,
  getCommandId,
} from '../../common/constants';
import type { SectionMetadata } from '../../common/schemas/types';
import { VscodeColor, VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { TreeItemClass } from '../../common/vscode/vscode-types';
import { Command } from '../../common/vscode/vscode-utils';
import type { SectionDefinition } from './section-registry';

function truncate(str: string, maxLen: number): string {
  const firstLine = str.split('\n')[0];
  if (firstLine.length <= maxLen) return firstLine;
  return `${firstLine.slice(0, maxLen - 3)}...`;
}

export class SectionItem extends TreeItemClass {
  constructor(
    public readonly section: SectionDefinition,
    public readonly value: string | undefined,
    private readonly branchName: string,
    private readonly metadata?: SectionMetadata,
    private readonly branchType?: string,
  ) {
    super(section.label, VscodeConstants.TreeItemCollapsibleState.None);

    this.contextValue = CONTEXT_VALUES.BRANCH_CONTEXT_FIELD;

    if (section.name === SECTION_NAME_BRANCH && branchType) {
      const colorMap: Record<string, VscodeColor> = {
        feature: VscodeColor.ChartsBlue,
        bugfix: VscodeColor.ChartsRed,
        chore: VscodeColor.ChartsPurple,
        other: VscodeColor.EditorLineNumberForeground,
      };
      const color = colorMap[branchType] || VscodeColor.EditorLineNumberForeground;
      this.iconPath = VscodeHelper.createCustomIcon(section.icon, color);
    } else {
      this.iconPath = VscodeHelper.createCustomIcon(section.icon);
    }

    this.description = this.getDescription();
    if (section.type === 'auto') {
      this.tooltip = value ?? 'Auto-populated section. Click to view, use "Sync" to refresh.';
    } else {
      this.tooltip = value ?? `Click to set ${section.label.toLowerCase()}`;
    }

    if (section.command) {
      this.command = {
        command: getCommandId(section.command),
        title: `Edit ${section.label}`,
        arguments: [{ branchName, value }],
      };
    } else {
      this.command = {
        command: getCommandId(Command.OpenBranchContextFileAtLine),
        title: `View ${section.label}`,
        arguments: [{ branchName, sectionName: section.name }],
      };
    }
  }

  private getDescription(): string {
    const notSetLabel = this.section.type === 'auto' ? DESCRIPTION_NOT_SYNCED : DESCRIPTION_NOT_SET;
    if (!this.value) return notSetLabel;

    if (this.metadata && METADATA_FIELD_DESCRIPTION in this.metadata) {
      return String(this.metadata[METADATA_FIELD_DESCRIPTION]);
    }

    return truncate(this.value, BRANCH_FIELD_DESCRIPTION_MAX_LENGTH);
  }
}
