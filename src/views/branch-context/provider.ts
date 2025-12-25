import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  CONFIG_CACHE_TTL_MS,
  ChangedFilesStyle,
  GIT_LOG_LAST_COMMIT_MESSAGE,
  GIT_REV_PARSE_HEAD,
  METADATA_FIELD_IS_EMPTY,
  NOT_GIT_REPO_MESSAGE,
  SECTION_NAME_BRANCH,
  SECTION_NAME_BRANCH_INFO,
  SECTION_NAME_CHANGED_FILES,
  SECTION_NAME_LINEAR_LINK,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_PR_LINK,
  SECTION_NAME_REQUIREMENTS,
  SECTION_NAME_TASKS,
  SYNC_DEBOUNCE_MS,
  WRITING_MARKDOWN_TIMEOUT_MS,
} from '../../common/constants';
import {
  BRANCH_CONTEXT_NA,
  BRANCH_CONTEXT_NO_CHANGES,
  ROOT_BRANCH_CONTEXT_FILE_NAME,
} from '../../common/constants/scripts-constants';
import {
  configDirExists,
  getBranchContextFilePath as getBranchContextFilePathUtil,
  loadWorkspaceConfigFromPath,
} from '../../common/lib/config-manager';
import { StoreKey, extensionStore } from '../../common/lib/extension-store';
import { createLogger } from '../../common/lib/logger';
import { ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import { branchContextState } from '../../common/lib/workspace-state';
import type { DevPanelConfig } from '../../common/schemas/config-schema';
import { SimpleCache } from '../../common/utils/cache';
import { formatRelativeTime } from '../../common/utils/time-formatter';
import { getFirstWorkspacePath } from '../../common/utils/workspace-utils';
import { getCurrentBranch, isGitRepository } from '../replacements/git-utils';
import { validateBranchContext } from './config-validator';
import { formatChangedFilesSummary, getChangedFilesWithSummary } from './git-changed-files';
import { SectionItem } from './items';
import { generateBranchContextMarkdown } from './markdown-generator';
import { getFieldLineNumber } from './markdown-parser';
import { type SyncContext, type TaskSyncProvider, createTaskProvider } from './providers';
import { SectionRegistry } from './section-registry';
import { loadBranchContext } from './state';
import { ValidationIndicator } from './validation-indicator';

const logger = createLogger('BranchContext');

export class BranchContextProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentBranch = '';
  private isWritingMarkdown = false;
  private isSyncing = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private lastSyncDirection: 'root-to-branch' | 'branch-to-root' | null = null;
  private validationIndicator: ValidationIndicator;
  private treeView: vscode.TreeView<vscode.TreeItem> | null = null;
  private descriptionInterval: NodeJS.Timeout | null = null;
  private sectionRegistryCache: SectionRegistry | null = null;
  private configHashCache: string | null = null;
  private configCache = new SimpleCache<DevPanelConfig | null>(CONFIG_CACHE_TTL_MS);
  private lastSyncTimestamp: string | null = null;
  private taskProvider: TaskSyncProvider;

  constructor() {
    this.validationIndicator = new ValidationIndicator();
    const workspace = getFirstWorkspacePath();
    const config = workspace ? loadWorkspaceConfigFromPath(workspace) : null;
    const tasksConfig = config?.branchContext?.builtinSections?.tasks;
    this.taskProvider = createTaskProvider(tasksConfig, workspace ?? undefined);
  }

  setTreeView(treeView: vscode.TreeView<vscode.TreeItem>): void {
    this.treeView = treeView;
    this.updateDescription();
    this.descriptionInterval = setInterval(() => {
      this.updateDescription();
    }, 60000);
  }

  private updateDescription(): void {
    if (!this.treeView) {
      logger.info('[updateDescription] No treeView, skipping');
      return;
    }

    if (!this.lastSyncTimestamp) {
      logger.info('[updateDescription] Loading timestamp from cache (first time)');
      const context = loadBranchContext(this.currentBranch);
      this.lastSyncTimestamp = (context.metadata?.lastSyncedTime as string) || null;
      logger.info(`[updateDescription] Loaded timestamp: ${this.lastSyncTimestamp}`);
    }

    if (this.lastSyncTimestamp) {
      const timestamp = new Date(this.lastSyncTimestamp).getTime();
      const description = formatRelativeTime(timestamp);
      logger.info(`[updateDescription] Setting description: "${description}" (timestamp: ${this.lastSyncTimestamp})`);
      this.treeView.description = description;
    } else {
      logger.info('[updateDescription] No timestamp available, clearing description');
      this.treeView.description = undefined;
    }
  }

  handleTemplateChange(): void {
    if (!this.currentBranch) return;
    logger.info('[BranchContextProvider] Template changed, syncing branch context');
    void this.syncBranchContext();
  }

  handleMarkdownChange(uri?: vscode.Uri): void {
    if (this.isWritingMarkdown || this.isSyncing) {
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace || !uri) return;

    const currentBranchPath = getBranchContextFilePathUtil(workspace, this.currentBranch);

    if (uri.fsPath !== currentBranchPath) {
      return;
    }

    this.debouncedSync(() => this.syncBranchToRoot());
  }

  handleRootMarkdownChange(): void {
    if (this.isWritingMarkdown || this.isSyncing) {
      return;
    }

    this.debouncedSync(() => this.syncRootToBranch());
  }

  async initialize(): Promise<void> {
    logger.info('[BranchContextProvider] initialize called');

    const workspace = getFirstWorkspacePath();
    if (!workspace) {
      logger.warn('[BranchContextProvider] No workspace found');
      return;
    }

    if (await isGitRepository(workspace)) {
      logger.info('[BranchContextProvider] Adding to git exclude');
      this.addToGitExclude(workspace);
    }

    const config = loadWorkspaceConfigFromPath(workspace);
    if (config) {
      const issues = validateBranchContext(workspace, config.branchContext);
      if (issues.length > 0) {
        this.validationIndicator.show(issues);
      } else {
        this.validationIndicator.hide();
      }
    } else {
      this.validationIndicator.hide();
    }
  }

  private addToGitExclude(workspace: string): void {
    const excludePath = path.join(workspace, '.git', 'info', 'exclude');
    if (!fs.existsSync(excludePath)) return;

    try {
      const content = fs.readFileSync(excludePath, 'utf-8');

      if (content.includes(ROOT_BRANCH_CONTEXT_FILE_NAME)) return;

      const newContent = content.endsWith('\n')
        ? `${content}${ROOT_BRANCH_CONTEXT_FILE_NAME}\n`
        : `${content}\n${ROOT_BRANCH_CONTEXT_FILE_NAME}\n`;
      fs.writeFileSync(excludePath, newContent);
    } catch (error) {
      logger.error(`Failed to update .git/info/exclude: ${error}`);
    }
  }

  setBranch(branchName: string, shouldRefresh = true): void {
    logger.info(`[BranchContextProvider] setBranch called: ${branchName} (current: ${this.currentBranch})`);

    if (branchName !== this.currentBranch) {
      this.currentBranch = branchName;
      if (shouldRefresh) {
        logger.info('[BranchContextProvider] Branch changed, refreshing');
        this.refresh();
      }
    }
  }

  private debouncedSync(syncFn: () => void): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      syncFn();
      this.refresh();
      this.syncDebounceTimer = null;
    }, SYNC_DEBOUNCE_MS);
  }

  private syncRootToBranch(): void {
    if (!this.currentBranch) {
      return;
    }

    if (this.lastSyncDirection === 'root-to-branch') {
      this.lastSyncDirection = null;
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const rootPath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
    const branchPath = getBranchContextFilePathUtil(workspace, this.currentBranch);

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

  private syncBranchToRoot(): void {
    if (!this.currentBranch) {
      return;
    }

    if (this.lastSyncDirection === 'branch-to-root') {
      this.lastSyncDirection = null;
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const rootPath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
    const branchPath = getBranchContextFilePathUtil(workspace, this.currentBranch);

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

  refresh(): void {
    void setContextKey(ContextKey.BranchContextHideEmptySections, branchContextState.getHideEmptySections());
    this.updateDescription();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element) return [];

    const workspace = getFirstWorkspacePath();
    if (!workspace) return [];

    if (!(await isGitRepository(workspace))) {
      return [new vscode.TreeItem(NOT_GIT_REPO_MESSAGE)];
    }

    if (!this.currentBranch) {
      this.currentBranch = await getCurrentBranch(workspace);
    }

    const context = loadBranchContext(this.currentBranch);
    const config = this.loadConfig(workspace);
    const hideEmpty = branchContextState.getHideEmptySections();
    const showChangedFiles = config?.branchContext?.builtinSections?.changedFiles ?? true;

    const registry = this.getSectionRegistry(workspace, config ?? undefined, showChangedFiles);

    const changedFilesSectionMetadata = context.metadata?.sections?.[SECTION_NAME_CHANGED_FILES];
    let changedFilesValue = BRANCH_CONTEXT_NO_CHANGES;
    if (changedFilesSectionMetadata) {
      const summary = {
        added: (changedFilesSectionMetadata.added as number) || 0,
        modified: (changedFilesSectionMetadata.modified as number) || 0,
        deleted: (changedFilesSectionMetadata.deleted as number) || 0,
      };
      changedFilesValue = formatChangedFilesSummary(summary);
    }

    const markdownPath = getBranchContextFilePathUtil(workspace, this.currentBranch);
    const syncContext: SyncContext = {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath,
      branchContext: context,
    };
    const taskStats = await this.taskProvider.getTaskStats(syncContext);
    const tasksValue = taskStats.total > 0 ? `${taskStats.completed}/${taskStats.total}` : undefined;

    const items: vscode.TreeItem[] = [];
    for (const section of registry.getAllSections()) {
      const value = this.getSectionValue(context, section.name, this.currentBranch, changedFilesValue, tasksValue);
      const sectionMetadata = context.metadata?.sections?.[section.name];

      if (hideEmpty && this.isSectionEmpty(value, section.type, sectionMetadata)) {
        continue;
      }

      items.push(new SectionItem(section, value, this.currentBranch, sectionMetadata, context.branchType));
    }

    return items;
  }

  private isSectionEmpty(value: string | undefined, sectionType: string, metadata?: Record<string, unknown>): boolean {
    if (sectionType === 'auto') {
      if (metadata && metadata[METADATA_FIELD_IS_EMPTY] === true) return true;
      return false;
    }

    if (!value) return true;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === BRANCH_CONTEXT_NA) return true;
    return false;
  }

  private getSectionValue(
    context: Record<string, unknown>,
    sectionName: string,
    currentBranch: string,
    changedFilesValue?: string,
    tasksValue?: string,
  ): string | undefined {
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

  private loadConfig(workspace: string): DevPanelConfig | null {
    const cached = this.configCache.get(workspace);
    if (cached !== undefined) {
      return cached;
    }

    const config = loadWorkspaceConfigFromPath(workspace);
    this.configCache.set(workspace, config);
    return config;
  }

  private getSectionRegistry(
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

  async editField(_branchName: string, sectionName: string, _currentValue: string | undefined): Promise<void> {
    const lineKeyMap: Record<string, string> = {
      [SECTION_NAME_BRANCH]: SECTION_NAME_BRANCH_INFO,
      [SECTION_NAME_PR_LINK]: SECTION_NAME_BRANCH_INFO,
      [SECTION_NAME_LINEAR_LINK]: SECTION_NAME_BRANCH_INFO,
      [SECTION_NAME_OBJECTIVE]: SECTION_NAME_OBJECTIVE,
      [SECTION_NAME_REQUIREMENTS]: SECTION_NAME_REQUIREMENTS,
      [SECTION_NAME_NOTES]: SECTION_NAME_NOTES,
    };

    const lineKey = lineKeyMap[sectionName] ?? sectionName;
    await this.openMarkdownFileAtLine(lineKey);
  }

  async openMarkdownFile(): Promise<void> {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const filePath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri);
  }

  async openMarkdownFileAtLine(fieldName: string): Promise<void> {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const filePath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
    const lineNumber = getFieldLineNumber(filePath, fieldName);
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      selection: new vscode.Range(lineNumber, 0, lineNumber, 0),
    });
  }

  async syncBranchContext(): Promise<void> {
    const startTime = Date.now();
    logger.info(`[syncBranchContext] START for branch: ${this.currentBranch}`);

    if (!this.currentBranch) {
      logger.warn('[syncBranchContext] No current branch, skipping');
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace) {
      logger.warn('[syncBranchContext] No workspace, skipping');
      return;
    }

    if (!configDirExists(workspace)) {
      logger.info('[syncBranchContext] No config directory, skipping');
      return;
    }

    logger.info(`[syncBranchContext] Loading context (+${Date.now() - startTime}ms)`);
    const context = loadBranchContext(this.currentBranch);
    const config = this.loadConfig(workspace);
    this.isWritingMarkdown = true;
    extensionStore.set(StoreKey.IsWritingBranchContext, true);

    try {
      const syncContext: SyncContext = {
        branchName: this.currentBranch,
        workspacePath: workspace,
        markdownPath: getBranchContextFilePathUtil(workspace, this.currentBranch),
        branchContext: context,
      };

      let changedFiles: string | undefined;
      let changedFilesSectionMetadata: Record<string, unknown> | undefined;
      const changedFilesConfig = config?.branchContext?.builtinSections?.changedFiles;

      if (changedFilesConfig !== false) {
        logger.info(`[syncBranchContext] Fetching changedFiles (+${Date.now() - startTime}ms)`);

        if (typeof changedFilesConfig === 'object' && changedFilesConfig.provider) {
          const registry = this.getSectionRegistry(workspace, config, changedFilesConfig);
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
        const registry = this.getSectionRegistry(workspace, config);
        const autoSections = registry.getAutoSections();
        logger.info(
          `[syncBranchContext] Fetching ${autoSections.length} auto sections in PARALLEL (+${Date.now() - startTime}ms)`,
        );

        const fetchPromises = autoSections
          .filter((section) => section.provider)
          .map(async (section) => {
            logger.info(`[syncBranchContext] Starting "${section.name}" (+${Date.now() - startTime}ms)`);
            try {
              const sectionContext: SyncContext = {
                ...syncContext,
                sectionOptions: section.options,
              };
              const data = await section.provider!.fetch(sectionContext);
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
        this.currentBranch,
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
      this.lastSyncTimestamp = new Date().toISOString();
      this.refresh();
      setTimeout(() => {
        this.isWritingMarkdown = false;
        extensionStore.set(StoreKey.IsWritingBranchContext, false);
      }, WRITING_MARKDOWN_TIMEOUT_MS);
      logger.info(`[syncBranchContext] END total time: ${Date.now() - startTime}ms`);
    }
  }

  dispose(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    if (this.descriptionInterval) {
      clearInterval(this.descriptionInterval);
      this.descriptionInterval = null;
    }
    this.validationIndicator.dispose();
  }
}
