import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import {
  ChangedFilesStyle,
  GIT_LOG_LAST_COMMIT_MESSAGE,
  GIT_REV_PARSE_HEAD,
  SECTION_NAME_CHANGED_FILES,
  SYNC_DEBOUNCE_MS,
  WRITING_MARKDOWN_TIMEOUT_MS,
} from '../../common/constants';
import { ConfigManager } from '../../common/lib/config-manager';
import { StoreKey, extensionStore } from '../../common/lib/extension-store';
import { createLogger } from '../../common/lib/logger';
import { extractSectionMetadata } from '../../common/utils/metadata-extractor';
import { getFirstWorkspacePath } from '../../common/utils/workspace-utils';
import { getChangedFilesWithSummary } from '../_branch_base/providers/default/file-changes-utils';
import type { SyncContext } from '../_branch_base/providers/interfaces';
import {
  extractAllFieldsRaw,
  generateBranchContextMarkdown,
  invalidateBranchContextCache,
  loadBranchContext,
  updateBranchContextCache,
} from '../_branch_base/storage';
import type { ProviderHelpers } from './provider-helpers';

const logger = createLogger('BranchContextSync');

enum SyncDirection {
  RootToBranch = 'root-to-branch',
  BranchToRoot = 'branch-to-root',
}

export class SyncManager {
  private isSyncing = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private lastSyncDirection: SyncDirection | null = null;
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
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return;
    }

    if (this.lastSyncDirection === SyncDirection.RootToBranch) {
      this.lastSyncDirection = null;
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const rootPath = ConfigManager.getRootBranchContextFilePath(workspace);
    const branchPath = ConfigManager.getBranchContextFilePath(workspace, currentBranch);

    if (!fs.existsSync(rootPath)) {
      return;
    }

    this.isSyncing = true;
    this.isWritingMarkdown = true;
    extensionStore.set(StoreKey.IsWritingBranchContext, true);
    this.lastSyncDirection = SyncDirection.RootToBranch;

    try {
      const content = fs.readFileSync(rootPath, 'utf-8');
      fs.writeFileSync(branchPath, content, 'utf-8');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error syncing root to branch: ${message}`);
    } finally {
      setTimeout(() => {
        this.isSyncing = false;
        this.isWritingMarkdown = false;
        extensionStore.set(StoreKey.IsWritingBranchContext, false);
        setTimeout(() => {
          this.lastSyncDirection = null;
        }, 300);
      }, 200);
    }
  }

  syncBranchToRoot() {
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return;
    }

    if (this.lastSyncDirection === SyncDirection.BranchToRoot) {
      this.lastSyncDirection = null;
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const rootPath = ConfigManager.getRootBranchContextFilePath(workspace);
    const branchPath = ConfigManager.getBranchContextFilePath(workspace, currentBranch);

    if (!fs.existsSync(branchPath)) {
      return;
    }

    this.isSyncing = true;
    this.isWritingMarkdown = true;
    extensionStore.set(StoreKey.IsWritingBranchContext, true);
    this.lastSyncDirection = SyncDirection.BranchToRoot;

    try {
      const content = fs.readFileSync(branchPath, 'utf-8');
      fs.writeFileSync(rootPath, content, 'utf-8');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error syncing branch to root: ${message}`);
    } finally {
      setTimeout(() => {
        this.isSyncing = false;
        this.isWritingMarkdown = false;
        extensionStore.set(StoreKey.IsWritingBranchContext, false);
        setTimeout(() => {
          this.lastSyncDirection = null;
        }, 300);
      }, 200);
    }
  }

  async syncBranchContext() {
    const startTime = Date.now();
    const currentBranch = this.getCurrentBranch();
    logger.info(`[syncBranchContext] START for branch: ${currentBranch}`);

    if (!currentBranch) {
      logger.warn('[syncBranchContext] No current branch, skipping');
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) {
      logger.warn('[syncBranchContext] No workspace, skipping');
      return;
    }

    logger.info(`[syncBranchContext] Loading context (+${Date.now() - startTime}ms)`);
    const context = loadBranchContext(currentBranch);
    const config = this.helpers.loadConfig(workspace);
    this.isWritingMarkdown = true;
    extensionStore.set(StoreKey.IsWritingBranchContext, true);

    try {
      const syncContext: SyncContext = {
        branchName: currentBranch,
        workspacePath: workspace,
        markdownPath: ConfigManager.getBranchContextFilePath(workspace, currentBranch),
        branchContext: context,
      };

      let changedFiles: string | undefined;
      let changedFilesSectionMetadata: Record<string, unknown> | undefined;
      const changedFilesConfig = config?.branchContext?.builtinSections?.changedFiles;

      if (changedFilesConfig !== false) {
        logger.info(`[syncBranchContext] Fetching changedFiles (+${Date.now() - startTime}ms)`);

        if (typeof changedFilesConfig === 'object' && changedFilesConfig.provider) {
          const registry = this.helpers.getSectionRegistry(workspace, config, changedFilesConfig);
          const changedFilesSection = registry.get(SECTION_NAME_CHANGED_FILES);

          if (changedFilesSection?.provider) {
            logger.info(`[syncBranchContext] Using custom provider for changedFiles: ${changedFilesConfig.provider}`);
            const data = await changedFilesSection.provider.fetch(syncContext);
            changedFiles = data;

            const metadataMatch = data.match(/<!--\s*SECTION_METADATA:\s*(.+?)\s*-->/);
            if (metadataMatch) {
              try {
                const parsed = JSON.parse(metadataMatch[1]);
                if (typeof parsed === 'object' && parsed !== null) {
                  changedFilesSectionMetadata = parsed as Record<string, unknown>;
                  changedFiles = data.replace(/<!--\s*SECTION_METADATA:.*?-->/g, '').trim();
                }
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                logger.error(`Failed to parse changedFiles metadata: ${message}`);
              }
            }
          }
        } else {
          const result = await getChangedFilesWithSummary(workspace, ChangedFilesStyle.List);
          changedFiles = result.content;
          changedFilesSectionMetadata = result.sectionMetadata;
        }

        logger.info(`[syncBranchContext] changedFiles done (+${Date.now() - startTime}ms)`);
      }

      const customAutoData: Record<string, string> = {};
      const customSectionMetadata: Record<string, Record<string, unknown>> = {};

      if (config?.branchContext?.customSections) {
        const registry = this.helpers.getSectionRegistry(workspace, config);
        const autoSections = registry.getAutoSections();

        let markdownFields: Record<string, string> = {};
        const markdownPath = ConfigManager.getBranchContextFilePath(workspace, currentBranch);
        if (fs.existsSync(markdownPath)) {
          const markdownContent = fs.readFileSync(markdownPath, 'utf-8');
          markdownFields = extractAllFieldsRaw(markdownContent);
        }

        const sectionsToFetch = autoSections.filter((section) => {
          if (!section.provider) return false;

          const customSection = config.branchContext?.customSections?.find((cs) => cs.name === section.name);
          if (customSection?.skipIfEmpty && customSection.skipIfEmpty.length > 0) {
            for (const fieldName of customSection.skipIfEmpty) {
              const fieldValue = markdownFields[fieldName];
              if (!fieldValue || fieldValue.trim() === '') {
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
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[syncBranchContext] "${section.name}" FAILED (+${Date.now() - startTime}ms): ${message}`);
            return { name: section.name, data: `Error: ${message}` };
          }
        });

        const results = await Promise.all(fetchPromises);
        for (const { name, data } of results) {
          const { cleanContent, metadata } = extractSectionMetadata(data);
          if (metadata) {
            customSectionMetadata[name] = metadata;
            customAutoData[name] = cleanContent;
            logger.info(
              `[syncBranchContext] Extracted metadata from "${name}": ${JSON.stringify(metadata).substring(0, 100)}`,
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
      logger.info(
        `[syncBranchContext] Section metadata map keys: ${Object.keys(sectionMetadataMap).join(', ') || 'none'}`,
      );

      let lastCommitHash: string | undefined;
      let lastCommitMessage: string | undefined;
      try {
        lastCommitHash = execSync(GIT_REV_PARSE_HEAD, { cwd: workspace, encoding: 'utf-8' }).trim();
        lastCommitMessage = execSync(GIT_LOG_LAST_COMMIT_MESSAGE, { cwd: workspace, encoding: 'utf-8' }).trim();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to get git commit info: ${message}`);
      }

      logger.info(`[syncBranchContext] Building updated context (+${Date.now() - startTime}ms)`);
      logger.info(
        `[syncBranchContext] Context before update - metadata.sections keys: ${Object.keys(context.metadata?.sections || {}).join(', ') || 'none'}`,
      );

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

      logger.info(
        `[syncBranchContext] Updated context - metadata.sections keys: ${Object.keys(updatedContext.metadata?.sections || {}).join(', ') || 'none'}`,
      );
      if (updatedContext.metadata?.sections) {
        for (const [name, metadata] of Object.entries(updatedContext.metadata.sections)) {
          logger.info(`[syncBranchContext] Section "${name}" metadata: ${JSON.stringify(metadata)}`);
        }
      }

      const markdownContent = await generateBranchContextMarkdown(
        currentBranch,
        updatedContext,
        Object.keys(sectionMetadataMap).length > 0 ? sectionMetadataMap : undefined,
      );

      if (markdownContent) {
        logger.info(`[syncBranchContext] Updating cache with new content (+${Date.now() - startTime}ms)`);
        updateBranchContextCache(currentBranch, updatedContext, markdownContent);
      } else {
        logger.warn('[syncBranchContext] No markdown content returned, invalidating cache');
        invalidateBranchContextCache(currentBranch);
      }

      logger.info(`[syncBranchContext] Syncing to root (+${Date.now() - startTime}ms)`);
      this.syncBranchToRoot();
    } finally {
      this.updateLastSyncTimestamp(new Date().toISOString());
      this.refresh();
      setTimeout(() => {
        this.isWritingMarkdown = false;
        extensionStore.set(StoreKey.IsWritingBranchContext, false);
        const wasInitializing = this.isInitializing;
        this.isInitializing = false;
        if (wasInitializing) {
          logger.info('[syncBranchContext] First sync complete, calling onSyncComplete');
          this.onSyncComplete?.();
        } else {
          logger.warn(
            '[syncBranchContext] NOT first sync (isInitializing=false), NOT calling onSyncComplete - BranchTasksProvider may not refresh!',
          );
        }
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
