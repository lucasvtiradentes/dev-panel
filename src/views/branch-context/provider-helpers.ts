import {
  METADATA_FIELD_IS_EMPTY,
  SECTION_NAME_BRANCH,
  SECTION_NAME_CHANGED_FILES,
  SECTION_NAME_LINEAR_LINK,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_PR_LINK,
  SECTION_NAME_REQUIREMENTS,
  SECTION_NAME_TASKS,
} from '../../common/constants';
import { BRANCH_CONTEXT_NA } from '../../common/constants/scripts-constants';
import { SimpleCache } from '../../common/lib/cache';
import type { DevPanelConfig } from '../../common/schemas/config-schema';
import { ConfigManager } from '../../common/utils/config-manager';
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

  getSectionRegistry(
    workspace: string,
    config?: DevPanelConfig,
    showChangedFiles: boolean | { provider: string } = true,
  ): SectionRegistry {
    const configHash = config ? JSON.stringify(config.branchContext) : '';

    if (this.sectionRegistryCache && this.configHashCache === configHash) {
      return this.sectionRegistryCache;
    }

    this.sectionRegistryCache = new SectionRegistry(workspace, config?.branchContext, showChangedFiles);
    this.configHashCache = configHash;
    return this.sectionRegistryCache;
  }

  getSectionValue(opts: {
    context: Record<string, unknown>;
    sectionName: string;
    currentBranch: string;
    changedFilesValue?: string;
    tasksValue?: string;
  }): string | undefined {
    const { context, sectionName, currentBranch, changedFilesValue, tasksValue } = opts;
    const valueMap: Record<string, string | undefined> = {
      [SECTION_NAME_BRANCH]: currentBranch,
      [SECTION_NAME_PR_LINK]: context.prLink as string | undefined,
      [SECTION_NAME_LINEAR_LINK]: context.linearLink as string | undefined,
      [SECTION_NAME_OBJECTIVE]: context.objective as string | undefined,
      [SECTION_NAME_REQUIREMENTS]: context.requirements as string | undefined,
      [SECTION_NAME_NOTES]: context.notes as string | undefined,
      [SECTION_NAME_TASKS]: tasksValue,
      [SECTION_NAME_CHANGED_FILES]: changedFilesValue,
    };

    if (sectionName in valueMap) {
      return valueMap[sectionName];
    }

    const value = context[sectionName];
    return typeof value === 'string' ? value : undefined;
  }

  isSectionEmpty(value: string | undefined, sectionType: string, metadata?: Record<string, unknown>): boolean {
    if (sectionType === 'auto') {
      if (metadata && metadata[METADATA_FIELD_IS_EMPTY] === true) return true;
      return false;
    }

    if (!value) return true;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === BRANCH_CONTEXT_NA) return true;
    return false;
  }
}
