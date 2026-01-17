import {
  BRANCH_CONTEXT_DEFAULT_ICON,
  SECTION_LABEL_BRANCH,
  SECTION_LABEL_CHANGED_FILES,
  SECTION_LABEL_LINEAR_LINK,
  SECTION_LABEL_NOTES,
  SECTION_LABEL_OBJECTIVE,
  SECTION_LABEL_PR_LINK,
  SECTION_LABEL_REQUIREMENTS,
  SECTION_NAME_BRANCH,
  SECTION_NAME_CHANGED_FILES,
  SECTION_NAME_LINEAR_LINK,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_PR_LINK,
  SECTION_NAME_REQUIREMENTS,
} from '../../common/constants';
import { createLogger } from '../../common/lib/logger';
import { SectionType } from '../../common/schemas';
import type { BranchContextConfig } from '../../common/schemas/config-schema';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeIcon, type VscodeIconString } from '../../common/vscode/vscode-constants';
import { DefaultChangedFilesProvider } from '../_branch_base/providers/default/changed-files.provider';
import type { AutoSectionProvider } from '../_branch_base/providers/interfaces';
import { loadAutoProvider } from '../_branch_base/providers/plugin-loader';

const logger = createLogger('SectionRegistry');

export type SectionDefinition = {
  name: string;
  label: string;
  type: SectionType;
  icon: VscodeIconString;
  isBuiltin: boolean;
  command?: Command;
  provider?: AutoSectionProvider;
  options?: Record<string, unknown>;
};

export class SectionRegistry {
  private sections: Map<string, SectionDefinition> = new Map();

  constructor(workspace: string, config?: Partial<BranchContextConfig>) {
    this.registerBuiltins();
    if (config) {
      this.registerCustom(workspace, config);
    }
  }

  private registerBuiltins() {
    this.register({
      name: SECTION_NAME_BRANCH,
      label: SECTION_LABEL_BRANCH,
      type: SectionType.Field,
      icon: VscodeIcon.GitBranch,
      isBuiltin: true,
      command: Command.EditBranchName,
    });

    this.register({
      name: SECTION_NAME_PR_LINK,
      label: SECTION_LABEL_PR_LINK,
      type: SectionType.Field,
      icon: VscodeIcon.GitPullRequest,
      isBuiltin: true,
      command: Command.EditBranchPrLink,
    });

    this.register({
      name: SECTION_NAME_LINEAR_LINK,
      label: SECTION_LABEL_LINEAR_LINK,
      type: SectionType.Field,
      icon: VscodeIcon.Link,
      isBuiltin: true,
      command: Command.EditBranchLinearLink,
    });

    this.register({
      name: SECTION_NAME_OBJECTIVE,
      label: SECTION_LABEL_OBJECTIVE,
      type: SectionType.Text,
      icon: VscodeIcon.Target,
      isBuiltin: true,
      command: Command.EditBranchObjective,
    });

    this.register({
      name: SECTION_NAME_REQUIREMENTS,
      label: SECTION_LABEL_REQUIREMENTS,
      type: SectionType.Text,
      icon: VscodeIcon.Checklist,
      isBuiltin: true,
      command: Command.EditBranchRequirements,
    });

    this.register({
      name: SECTION_NAME_NOTES,
      label: SECTION_LABEL_NOTES,
      type: SectionType.Text,
      icon: VscodeIcon.Note,
      isBuiltin: true,
      command: Command.EditBranchNotes,
    });

    this.register({
      name: SECTION_NAME_CHANGED_FILES,
      label: SECTION_LABEL_CHANGED_FILES,
      type: SectionType.Auto,
      icon: VscodeIcon.Diff,
      isBuiltin: true,
      provider: new DefaultChangedFilesProvider(),
    });
  }

  private registerCustom(workspace: string, config: Partial<BranchContextConfig>) {
    if (!config.customSections) {
      logger.info('[registerCustom] No custom sections in config');
      return;
    }

    logger.info(`[registerCustom] Registering ${config.customSections.length} custom sections`);

    for (const section of config.customSections) {
      logger.info(`[registerCustom] Processing section: ${section.name}, type: ${section.type}`);

      let provider: AutoSectionProvider | undefined;
      if (section.type === SectionType.Auto && section.provider) {
        logger.info(`[registerCustom] Loading provider for ${section.name}: ${section.provider}`);
        provider = loadAutoProvider(workspace, section.provider);
        logger.info(`[registerCustom] Provider loaded successfully for ${section.name}`);
      }

      this.register({
        name: section.name,
        label: section.label ?? section.name,
        type: section.type as SectionType,
        icon: section.icon ?? BRANCH_CONTEXT_DEFAULT_ICON,
        isBuiltin: false,
        provider,
        options: section.options,
      });

      logger.info(`[registerCustom] Registered section: ${section.name}`);
    }
  }

  private register(definition: SectionDefinition) {
    this.sections.set(definition.name, definition);
  }

  get(name: string): SectionDefinition | undefined {
    return this.sections.get(name);
  }

  getAllSections(): SectionDefinition[] {
    return Array.from(this.sections.values());
  }

  getAutoSections(): SectionDefinition[] {
    return this.getAllSections().filter((s) => s.type === SectionType.Auto);
  }

  getFieldSections(): SectionDefinition[] {
    return this.getAllSections().filter((s) => s.type === SectionType.Field);
  }

  getTextSections(): SectionDefinition[] {
    return this.getAllSections().filter((s) => s.type === SectionType.Text);
  }
}
