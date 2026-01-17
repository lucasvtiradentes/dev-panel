import { SECTION_NAME_BRANCH, SECTION_NAME_CHANGED_FILES } from '../../common/constants';
import { BranchContextMarkdownHelper } from '../../common/core/branch-context-markdown';
import { ConfigManager } from '../../common/core/config-manager';
import { SimpleCache } from '../../common/lib/cache';
import type { DevPanelConfig } from '../../common/schemas/config-schema';
import type { SectionType } from '../../common/schemas/types';
import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { SectionRegistry } from './section-registry';

const CONFIG_CACHE_TTL_MS = 5000;

export class ProviderHelpers {
  private sectionRegistryCache: SectionRegistry | null = null;
  private configHashCache: string | null = null;
  private configCache = new SimpleCache<DevPanelConfig | null>(CONFIG_CACHE_TTL_MS);

  loadConfig(workspace: string): DevPanelConfig | null {
    const cached = this.configCache.get(workspace);
    if (cached !== undefined) {
      return cached;
    }

    const config = ConfigManager.loadWorkspaceConfigFromPath(workspace);
    this.configCache.set(workspace, config);
    return config;
  }

  getSectionRegistry(workspace: string, config?: DevPanelConfig): SectionRegistry {
    const configHash = config ? JSON.stringify(config.branchContext) : '';

    if (this.sectionRegistryCache && this.configHashCache === configHash) {
      return this.sectionRegistryCache;
    }

    this.sectionRegistryCache = new SectionRegistry(workspace, config?.branchContext);
    this.configHashCache = configHash;
    return this.sectionRegistryCache;
  }

  getSectionValue(opts: {
    context: Record<string, unknown>;
    sectionName: string;
    currentBranch: string;
    changedFilesValue?: string;
  }): string | undefined {
    const { context, sectionName, currentBranch, changedFilesValue } = opts;

    if (sectionName === SECTION_NAME_BRANCH) {
      return currentBranch;
    }

    if (sectionName === SECTION_NAME_CHANGED_FILES) {
      return changedFilesValue;
    }

    const value = context[sectionName];
    return TypeGuardsHelper.isString(value) ? value : undefined;
  }

  isSectionEmpty(value: string | undefined, sectionType: SectionType, metadata?: Record<string, unknown>): boolean {
    return BranchContextMarkdownHelper.isSectionEmpty(value, sectionType, metadata);
  }
}
