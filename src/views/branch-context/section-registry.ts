import {
  BRANCH_CONTEXT_DEFAULT_ICON,
  SECTION_LABEL_BRANCH,
  SECTION_LABEL_CHANGED_FILES,
  SECTION_NAME_BRANCH,
  SECTION_NAME_CHANGED_FILES,
} from '../../common/constants';
import { createLogger } from '../../common/lib/logger';
import { SectionType } from '../../common/schemas';
import type { BranchContextConfig } from '../../common/schemas/config-schema';
import { VscodeIcon, type VscodeIconString } from '../../common/vscode/vscode-constants';
import {
  type AutoSectionProvider,
  DefaultChangedFilesProvider,
  loadAutoProvider,
} from '../../features/branch-context-sync';

const logger = createLogger('SectionRegistry');

export type SectionDefinition = {
  name: string;
  label: string;
  type: SectionType;
  icon: VscodeIconString;
  isBuiltin: boolean;
  provider?: AutoSectionProvider;
  options?: Record<string, unknown>;
};

export class SectionRegistry {
  private sections: Map<string, SectionDefinition> = new Map();

  constructor(workspace: string, config?: Partial<BranchContextConfig>) {
    this.registerBuiltins();
    if (config) {
      this.registerFields(config);
      this.registerSections(workspace, config);
    }
  }

  private registerBuiltins() {
    this.register({
      name: SECTION_NAME_BRANCH,
      label: SECTION_LABEL_BRANCH,
      type: SectionType.Field,
      icon: VscodeIcon.GitBranch,
      isBuiltin: true,
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

  private registerFields(config: Partial<BranchContextConfig>) {
    if (!config.fields || config.fields.length === 0) {
      logger.info('[registerFields] No fields in config');
      return;
    }

    logger.info(`[registerFields] Registering ${config.fields.length} fields`);

    for (const field of config.fields) {
      logger.info(`[registerFields] Processing field: ${field.name}`);

      this.register({
        name: field.name,
        label: field.label ?? field.name,
        type: SectionType.Field,
        icon: field.icon ?? BRANCH_CONTEXT_DEFAULT_ICON,
        isBuiltin: false,
      });

      logger.info(`[registerFields] Registered field: ${field.name}`);
    }
  }

  private registerSections(workspace: string, config: Partial<BranchContextConfig>) {
    if (!config.sections || config.sections.length === 0) {
      logger.info('[registerSections] No sections in config');
      return;
    }

    logger.info(`[registerSections] Registering ${config.sections.length} sections`);

    for (const section of config.sections) {
      logger.info(`[registerSections] Processing section: ${section.name}, type: ${section.type}`);

      let provider: AutoSectionProvider | undefined;
      if (section.type === SectionType.Auto && section.provider) {
        logger.info(`[registerSections] Loading provider for ${section.name}: ${section.provider}`);
        provider = loadAutoProvider(workspace, section.provider);
        logger.info(`[registerSections] Provider loaded successfully for ${section.name}`);
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

      logger.info(`[registerSections] Registered section: ${section.name}`);
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
