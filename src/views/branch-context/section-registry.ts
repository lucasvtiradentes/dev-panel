import {
  BRANCH_CONTEXT_DEFAULT_ICON,
  SECTION_LABEL_BRANCH,
  SECTION_LABEL_LINEAR_LINK,
  SECTION_LABEL_NOTES,
  SECTION_LABEL_OBJECTIVE,
  SECTION_LABEL_PR_LINK,
  SECTION_LABEL_REQUIREMENTS,
  SECTION_NAME_BRANCH,
  SECTION_NAME_LINEAR_LINK,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_PR_LINK,
  SECTION_NAME_REQUIREMENTS,
} from '../../common/constants';
import { createLogger } from '../../common/lib/logger';
import { Command } from '../../common/lib/vscode-utils';
import type { BranchContextConfig } from '../../common/schemas/config-schema';
import type { AutoSectionProvider } from './providers/interfaces';
import { loadAutoProvider } from './providers/plugin-loader';

const logger = createLogger('SectionRegistry');

export type SectionType = 'field' | 'text' | 'auto' | 'special';

export type SectionDefinition = {
  name: string;
  label: string;
  type: SectionType;
  icon: string;
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

  private registerBuiltins(): void {
    this.register({
      name: SECTION_NAME_BRANCH,
      label: SECTION_LABEL_BRANCH,
      type: 'field',
      icon: 'git-branch',
      isBuiltin: true,
      command: Command.EditBranchName,
    });

    this.register({
      name: SECTION_NAME_PR_LINK,
      label: SECTION_LABEL_PR_LINK,
      type: 'field',
      icon: 'git-pull-request',
      isBuiltin: true,
      command: Command.EditBranchPrLink,
    });

    this.register({
      name: SECTION_NAME_LINEAR_LINK,
      label: SECTION_LABEL_LINEAR_LINK,
      type: 'field',
      icon: 'link',
      isBuiltin: true,
      command: Command.EditBranchLinearLink,
    });

    this.register({
      name: SECTION_NAME_OBJECTIVE,
      label: SECTION_LABEL_OBJECTIVE,
      type: 'text',
      icon: 'target',
      isBuiltin: true,
      command: Command.EditBranchObjective,
    });

    this.register({
      name: SECTION_NAME_REQUIREMENTS,
      label: SECTION_LABEL_REQUIREMENTS,
      type: 'text',
      icon: 'checklist',
      isBuiltin: true,
      command: Command.EditBranchRequirements,
    });

    this.register({
      name: SECTION_NAME_NOTES,
      label: SECTION_LABEL_NOTES,
      type: 'text',
      icon: 'note',
      isBuiltin: true,
      command: Command.EditBranchNotes,
    });
  }

  private registerCustom(workspace: string, config: Partial<BranchContextConfig>): void {
    if (!config.customSections) {
      logger.info('[registerCustom] No custom sections in config');
      return;
    }

    logger.info(`[registerCustom] Registering ${config.customSections.length} custom sections`);

    for (const section of config.customSections) {
      logger.info(`[registerCustom] Processing section: ${section.name}, type: ${section.type}`);

      let provider: AutoSectionProvider | undefined;
      if (section.type === 'auto' && section.provider) {
        logger.info(`[registerCustom] Loading provider for ${section.name}: ${section.provider}`);
        provider = loadAutoProvider(workspace, section.provider);
        logger.info(`[registerCustom] Provider loaded successfully for ${section.name}`);
      }

      this.register({
        name: section.name,
        label: section.label ?? section.name,
        type: section.type,
        icon: section.icon ?? BRANCH_CONTEXT_DEFAULT_ICON,
        isBuiltin: false,
        provider,
        options: section.options,
      });

      logger.info(`[registerCustom] Registered section: ${section.name}`);
    }
  }

  private register(definition: SectionDefinition): void {
    this.sections.set(definition.name, definition);
  }

  get(name: string): SectionDefinition | undefined {
    return this.sections.get(name);
  }

  getAllSections(): SectionDefinition[] {
    return Array.from(this.sections.values());
  }

  getAutoSections(): SectionDefinition[] {
    return this.getAllSections().filter((s) => s.type === 'auto');
  }

  getFieldSections(): SectionDefinition[] {
    return this.getAllSections().filter((s) => s.type === 'field');
  }

  getTextSections(): SectionDefinition[] {
    return this.getAllSections().filter((s) => s.type === 'text');
  }
}
