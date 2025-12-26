import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ChangedFilesStyle,
  GIT_LOG_LAST_COMMIT_MESSAGE,
  GIT_REV_PARSE_HEAD,
  SECTION_NAME_CHANGED_FILES,
  SYNC_DEBOUNCE_MS,
  WRITING_MARKDOWN_TIMEOUT_MS,
} from '../../common/constants';
import { ROOT_BRANCH_CONTEXT_FILE_NAME } from '../../common/constants/scripts-constants';
import { getBranchContextFilePath as getBranchContextFilePathUtil } from '../../common/lib/config-manager';
import { StoreKey, extensionStore } from '../../common/lib/extension-store';
import { createLogger } from '../../common/lib/logger';
import { getFirstWorkspacePath } from '../../common/utils/workspace-utils';
import { getChangedFilesWithSummary } from '../_branch_context/providers/default/file-changes-utils';
import type { SyncContext } from '../_branch_context/providers/interfaces';
import { generateBranchContextMarkdown, loadBranchContext } from '../_branch_context/storage';
import type { ProviderHelpers } from './provider-helpers';

const logger = createLogger('BranchContextSync');

export class SyncManager {
  private isSyncing = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private lastSyncDirection: 'root-to-branch' | 'branch-to-root' | null = null;
  private isWritingMarkdown = false;

  constructor(
    private getCurrentBranch: () => string,
    private helpers: ProviderHelpers,
    private refresh: () => void,
    private updateLastSyncTimestamp: (timestamp: string) => void,
  ) {}

  debouncedSync(syncFn: () => void) {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      syncFn();
      this.refresh();
      this.syncDebounceTimer = null;
    }, SYNC_DEBOUNCE_MS);
  }

  syncRootToBranch() {
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return;
    }

    if (this.lastSyncDirection === 'root-to-branch') {
      this.lastSyncDirection = null;
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const rootPath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
    const branchPath = getBranchContextFilePathUtil(workspace, currentBranch);

    if (!fs.existsSync(rootPath)) {
      return;
    }

    this.isSyncing = true;
    this.lastSyncDirection = 'root-to-branch';

    try {
      const content = fs.readFileSync(rootPath, 'utf-8');
      fs.writeFileSync(branchPath, content, 'utf-8');
    } catch (error) {
      logger.error(`Error syncing root to branch: ${error}`);
    } finally {
      setTimeout(() => {
        this.isSyncing = false;
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

    if (this.lastSyncDirection === 'branch-to-root') {
      this.lastSyncDirection = null;
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const rootPath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
    const branchPath = getBranchContextFilePathUtil(workspace, currentBranch);

    if (!fs.existsSync(branchPath)) {
      return;
    }

    this.isSyncing = true;
    this.lastSyncDirection = 'branch-to-root';

    try {
      const content = fs.readFileSync(branchPath, 'utf-8');
      fs.writeFileSync(rootPath, content, 'utf-8');
    } catch (error) {
      logger.error(`Error syncing branch to root: ${error}`);
    } finally {
      setTimeout(() => {
        this.isSyncing = false;
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
        markdownPath: getBranchContextFilePathUtil(workspace, currentBranch),
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
                changedFilesSectionMetadata = JSON.parse(metadataMatch[1]) as Record<string, unknown>;
                changedFiles = data.replace(/<!--\s*SECTION_METADATA:.*?-->/g, '').trim();
              } catch (error) {
                logger.error(`Failed to parse changedFiles metadata: ${error}`);
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
      if (config?.branchContext?.customSections) {
        const registry = this.helpers.getSectionRegistry(workspace, config);
        const autoSections = registry.getAutoSections();
        logger.info(
          `[syncBranchContext] Fetching ${autoSections.length} auto sections in PARALLEL (+${Date.now() - startTime}ms)`,
        );

        const fetchPromises = autoSections
          .filter((section) => section.provider)
          .map(async (section) => {
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
            } catch (error) {
              logger.error(`[syncBranchContext] "${section.name}" FAILED (+${Date.now() - startTime}ms): ${error}`);
              return { name: section.name, data: `Error: ${error}` };
            }
          });

        const results = await Promise.all(fetchPromises);
        for (const { name, data } of results) {
          customAutoData[name] = data;
        }
        logger.info(`[syncBranchContext] All auto sections done (+${Date.now() - startTime}ms)`);
      }

      logger.info(`[syncBranchContext] Generating markdown (+${Date.now() - startTime}ms)`);
      const sectionMetadataMap: Record<string, Record<string, unknown>> = {};
      if (changedFilesSectionMetadata) {
        sectionMetadataMap[SECTION_NAME_CHANGED_FILES] = changedFilesSectionMetadata;
      }

      let lastCommitHash: string | undefined;
      let lastCommitMessage: string | undefined;
      try {
        lastCommitHash = execSync(GIT_REV_PARSE_HEAD, { cwd: workspace, encoding: 'utf-8' }).trim();
        lastCommitMessage = execSync(GIT_LOG_LAST_COMMIT_MESSAGE, { cwd: workspace, encoding: 'utf-8' }).trim();
      } catch (error) {
        logger.error(`Failed to get git commit info: ${error}`);
      }

      await generateBranchContextMarkdown(
        currentBranch,
        {
          ...context,
          changedFiles,
          ...customAutoData,
          metadata: {
            lastSyncedTime: new Date().toISOString(),
            lastCommitMessage,
            lastCommitHash,
          },
        },
        Object.keys(sectionMetadataMap).length > 0 ? sectionMetadataMap : undefined,
      );

      logger.info(`[syncBranchContext] Syncing to root (+${Date.now() - startTime}ms)`);
      this.syncBranchToRoot();
    } finally {
      this.updateLastSyncTimestamp(new Date().toISOString());
      this.refresh();
      setTimeout(() => {
        this.isWritingMarkdown = false;
        extensionStore.set(StoreKey.IsWritingBranchContext, false);
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

  dispose() {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
  }
}
