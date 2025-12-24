import {
  BRANCH_CONTEXT_DEFAULT_ICON,
  BRANCH_CONTEXT_FIELD_BRANCH,
  BRANCH_CONTEXT_FIELD_LINEAR_LINK,
  BRANCH_CONTEXT_FIELD_PR_LINK,
  BRANCH_CONTEXT_SECTION_NOTES,
  BRANCH_CONTEXT_SECTION_OBJECTIVE,
  BRANCH_CONTEXT_SECTION_REQUIREMENTS,
} from '../../common/constants';
import { createLogger } from '../../common/lib/logger';
import type { BranchContextConfig } from '../../common/schemas/config-schema';
import type { AutoSectionProvider } from './providers/interfaces';
import { loadAutoProvider } from './providers/plugin-loader';

const logger = createLogger('SectionRegistry');

export type SectionType = 'field' | 'text' | 'auto' | 'special';

export type SectionDefinition = {
  name: string;
  type: SectionType;
  icon: string;
  isBuiltin: boolean;
  provider?: AutoSectionProvider;
  options?: Record<string, unknown>;
};

export class SectionRegistry {
  private sections: Map<string, SectionDefinition> = new Map();

  constructor(workspace: string, config: BranchContextConfig) {
    this.registerBuiltins();
    this.registerCustom(workspace, config);
  }

  private registerBuiltins(): void {
    this.register({
      name: BRANCH_CONTEXT_FIELD_BRANCH.replace(':', '').trim(),
      type: 'field',
      icon: 'git-branch',
      isBuiltin: true,
    });

    this.register({
      name: BRANCH_CONTEXT_FIELD_PR_LINK.replace(':', '').trim(),
      type: 'field',
      icon: 'git-pull-request',
      isBuiltin: true,
    });

    this.register({
      name: BRANCH_CONTEXT_FIELD_LINEAR_LINK.replace(':', '').trim(),
      type: 'field',
      icon: 'link',
      isBuiltin: true,
    });

    this.register({
      name: BRANCH_CONTEXT_SECTION_OBJECTIVE.replace('#', '').trim(),
      type: 'text',
      icon: 'target',
      isBuiltin: true,
    });

    this.register({
      name: BRANCH_CONTEXT_SECTION_REQUIREMENTS.replace('#', '').trim(),
      type: 'text',
      icon: 'checklist',
      isBuiltin: true,
    });

    this.register({
      name: BRANCH_CONTEXT_SECTION_NOTES.replace('#', '').trim(),
      type: 'text',
      icon: 'note',
      isBuiltin: true,
    });
  }

  private registerCustom(workspace: string, config: BranchContextConfig): void {
    if (!config.sections) {
      logger.info('[registerCustom] No custom sections in config');
      return;
    }

    logger.info(`[registerCustom] Registering ${config.sections.length} custom sections`);

    for (const section of config.sections) {
      logger.info(`[registerCustom] Processing section: ${section.name}, type: ${section.type}`);

      let provider: AutoSectionProvider | undefined;
      if (section.type === 'auto' && section.provider) {
        logger.info(`[registerCustom] Loading provider for ${section.name}: ${section.provider}`);
        provider = loadAutoProvider(workspace, section.provider);
        logger.info(`[registerCustom] Provider loaded successfully for ${section.name}`);
      }

      this.register({
        name: section.name,
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
