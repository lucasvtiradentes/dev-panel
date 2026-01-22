import { BranchContextMarkdownHelper } from 'src/common/core/branch-context-markdown';
import {
  METADATA_SECTION_REGEX_CAPTURE,
  METADATA_SECTION_REGEX_GLOBAL,
  SECTION_NAME_CHANGED_FILES,
} from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { StoreKey, extensionStore } from '../../common/core/extension-store';
import { Git } from '../../common/lib/git';
import { createLogger } from '../../common/lib/logger';
import { extractSectionMetadata } from '../../common/utils/functions/extract-section-metadata';
import { JsonHelper } from '../../common/utils/helpers/json-helper';
import { FileIOHelper } from '../../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import {
  SYNC_DEBOUNCE_MS,
  WRITING_MARKDOWN_TIMEOUT_MS,
  extractAllFieldsRaw,
  generateBranchContextMarkdown,
  getSyncCoordinator,
  invalidateBranchContextCache,
  loadBranchContext,
  updateBranchContextCache,
} from '../../features/branch-context-sync';
import type { SyncContext } from '../_branch_base/providers/interfaces';
import type { ProviderHelpers } from './provider-helpers';

const logger = createLogger('BranchContextSync');

export class SyncManager {
  private isSyncing = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private isWritingMarkdown = false;
  private isInitializing = true;

  constructor(
    private getCurrentBranch: () => string,
    private helpers: ProviderHelpers,
    private refresh: () => void,
    private updateLastSyncTimestamp: (timestamp: string) => void,
    private onSyncComplete?: () => void,
  ) {}

  debouncedSync(syncFn: () => void, shouldRefresh = true) {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      syncFn();
      if (shouldRefresh) {
        this.refresh();
        this.onSyncComplete?.();
      }
      this.syncDebounceTimer = null;
    }, SYNC_DEBOUNCE_MS);
  }

  syncRootToBranch() {
    const coordinator = getSyncCoordinator();
    coordinator.syncRootToBranch();
    this.refresh();
    this.onSyncComplete?.();
  }

  async syncBranchContext(comparisonBranch: string) {
    const startTime = Date.now();
    const currentBranch = this.getCurrentBranch();
    logger.info(`[syncBranchContext] START for branch: ${currentBranch}, comparisonBranch: ${comparisonBranch}`);

    if (!currentBranch) {
      logger.warn('[syncBranchContext] No current branch, skipping');
      return;
    }

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) {
      logger.warn('[syncBranchContext] No workspace, skipping');
      return;
    }

    logger.info(`[syncBranchContext] Loading context (+${Date.now() - startTime}ms)`);
    const context = loadBranchContext(currentBranch);
    const config = this.helpers.loadConfig(workspace);
    this.isWritingMarkdown = true;
    extensionStore.set(StoreKey.IsWritingBranchContext, true);

    const coordinator = getSyncCoordinator();
    coordinator.markSyncStarted(currentBranch);

    try {
      const syncContext: SyncContext = {
        branchName: currentBranch,
        workspacePath: workspace,
        markdownPath: ConfigManager.getBranchContextFilePath(workspace, currentBranch),
        branchContext: context,
        comparisonBranch,
      };

      let changedFiles: string | undefined;
      let changedFilesSectionMetadata: Record<string, unknown> | undefined;

      logger.info(`[syncBranchContext] Fetching changedFiles (+${Date.now() - startTime}ms)`);

      const registry = this.helpers.getSectionRegistry(workspace, config ?? undefined);
      const changedFilesSection = registry.get(SECTION_NAME_CHANGED_FILES);

      if (changedFilesSection?.provider) {
        const data = await changedFilesSection.provider.fetch(syncContext);
        changedFiles = data;

        const metadataMatch = data.match(METADATA_SECTION_REGEX_CAPTURE);
        if (metadataMatch) {
          const parsed = JsonHelper.parse(metadataMatch[1]);
          if (parsed && TypeGuardsHelper.isObject(parsed)) {
            changedFilesSectionMetadata = parsed as Record<string, unknown>;
            changedFiles = data.replace(METADATA_SECTION_REGEX_GLOBAL, '').trim();
          }
        }
      }

      logger.info(`[syncBranchContext] changedFiles done (+${Date.now() - startTime}ms)`);

      const gitInfoPromise = Promise.all([
        Git.getLastCommitHash(workspace).catch(() => undefined),
        Git.getLastCommitMessage(workspace).catch(() => undefined),
      ]);

      const customAutoData: Record<string, string> = {};
      const customSectionMetadata: Record<string, Record<string, unknown>> = {};

      if (config?.branchContext?.sections) {
        const autoSections = registry.getAutoSections();

        let markdownFields: Record<string, string> = {};
        const markdownPath = ConfigManager.getBranchContextFilePath(workspace, currentBranch);
        const markdownContent = FileIOHelper.readFileIfExists(markdownPath);
        if (markdownContent) {
          markdownFields = extractAllFieldsRaw(markdownContent);
        }

        const sectionsToFetch = autoSections.filter((section) => {
          if (!section.provider) return false;
          if (section.name === SECTION_NAME_CHANGED_FILES) return false;

          const customSection = config.branchContext?.sections?.find((cs) => cs.name === section.name);
          if (customSection?.skipIfEmpty && customSection.skipIfEmpty.length > 0) {
            for (const fieldName of customSection.skipIfEmpty) {
              const fieldValue = markdownFields[fieldName];
              if (BranchContextMarkdownHelper.isFieldEmpty(fieldValue)) {
                logger.info(
                  `[syncBranchContext] Skipping "${section.name}" - field "${fieldName}" is empty (+${Date.now() - startTime}ms)`,
                );
                customAutoData[section.name] = `No ${fieldName.toLowerCase()} set`;
                customSectionMetadata[section.name] = { isEmpty: true, description: 'Skipped - field empty' };
                return false;
              }
            }
          }

          return true;
        });

        logger.info(
          `[syncBranchContext] Fetching ${sectionsToFetch.length}/${autoSections.length} auto sections in PARALLEL (+${Date.now() - startTime}ms)`,
        );

        const fetchPromises = sectionsToFetch.map(async (section) => {
          logger.info(`[syncBranchContext] Starting "${section.name}" (+${Date.now() - startTime}ms)`);
          try {
            if (!section.provider) {
              throw new Error('Provider is not defined');
            }
            const sectionContext: SyncContext = {
              ...syncContext,
              sectionOptions: section.options,
            };
            const data = await section.provider.fetch(sectionContext);
            logger.info(`[syncBranchContext] "${section.name}" done (+${Date.now() - startTime}ms)`);
            return { name: section.name, data };
          } catch (error: unknown) {
            const errorMessage = TypeGuardsHelper.getErrorMessage(error);
            logger.error(
              `[syncBranchContext] "${section.name}" FAILED (+${Date.now() - startTime}ms): ${errorMessage}`,
            );
            return { name: section.name, data: `Error: ${errorMessage}` };
          }
        });

        const results = await Promise.all(fetchPromises);
        for (const { name, data } of results) {
          const { cleanContent, metadata } = extractSectionMetadata(data);
          if (metadata) {
            customSectionMetadata[name] = metadata;
            customAutoData[name] = cleanContent;
            logger.info(
              `[syncBranchContext] Extracted metadata from "${name}": ${JsonHelper.stringify(metadata).substring(0, 100)}`,
            );
          } else {
            customAutoData[name] = data;
          }
        }
        logger.info(`[syncBranchContext] All auto sections done (+${Date.now() - startTime}ms)`);
      }

      logger.info(`[syncBranchContext] Generating markdown (+${Date.now() - startTime}ms)`);
      const sectionMetadataMap: Record<string, Record<string, unknown>> = {};
      if (changedFilesSectionMetadata) {
        sectionMetadataMap[SECTION_NAME_CHANGED_FILES] = changedFilesSectionMetadata;
      }
      for (const [name, metadata] of Object.entries(customSectionMetadata)) {
        sectionMetadataMap[name] = metadata;
      }
      logger.info(`[syncBranchContext] Section metadata map keys: ${Object.keys(sectionMetadataMap).join(', ')}`);

      const [lastCommitHash, lastCommitMessage] = await gitInfoPromise;

      logger.info(`[syncBranchContext] Building updated context (+${Date.now() - startTime}ms)`);

      const updatedContext = {
        ...context,
        changedFiles,
        ...customAutoData,
        metadata: {
          ...(context.metadata || {}),
          sections: Object.keys(sectionMetadataMap).length > 0 ? sectionMetadataMap : undefined,
          lastSyncedTime: new Date().toISOString(),
          lastCommitMessage,
          lastCommitHash,
        },
      };

      const markdownContent = await generateBranchContextMarkdown(
        currentBranch,
        updatedContext,
        Object.keys(sectionMetadataMap).length > 0 ? sectionMetadataMap : undefined,
      );

      if (markdownContent) {
        logger.info(`[syncBranchContext] Updating cache with new content (+${Date.now() - startTime}ms)`);
        updateBranchContextCache(currentBranch, updatedContext, markdownContent);

        const rootPath = ConfigManager.getRootBranchContextFilePath(workspace);
        FileIOHelper.writeFile(rootPath, markdownContent);
        logger.info(`[syncBranchContext] Synced to root file (+${Date.now() - startTime}ms)`);
      } else {
        logger.warn('[syncBranchContext] No markdown content returned, invalidating cache');
        invalidateBranchContextCache(currentBranch);
      }
    } finally {
      this.updateLastSyncTimestamp(new Date().toISOString());
      this.refresh();
      setTimeout(() => {
        this.isWritingMarkdown = false;
        extensionStore.set(StoreKey.IsWritingBranchContext, false);
        this.isInitializing = false;
        coordinator.markSyncCompleted(currentBranch);
        this.onSyncComplete?.();
      }, WRITING_MARKDOWN_TIMEOUT_MS);
      logger.info(`[syncBranchContext] END total time: ${Date.now() - startTime}ms`);
    }
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  getIsWritingMarkdown(): boolean {
    return this.isWritingMarkdown;
  }

  resetInitializing() {
    logger.info('[SyncManager] [resetInitializing] Resetting isInitializing to true for new branch');
    this.isInitializing = true;
  }

  dispose() {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
  }
}
