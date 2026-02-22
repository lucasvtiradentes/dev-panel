import {
  BASE_BRANCH,
  BRANCH_CONTEXT_NO_CHANGES,
  NOT_GIT_REPO_MESSAGE,
  SECTION_NAME_BRANCH_INFO,
  SECTION_NAME_CHANGED_FILES,
} from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { Git } from '../../common/lib/git';
import { createLogger } from '../../common/lib/logger';
import { SectionType } from '../../common/schemas';
import { branchContextState } from '../../common/state';
import { formatRelativeTime } from '../../common/utils/functions/format-relative-time';
import { MarkdownHelper } from '../../common/utils/helpers/markdown-helper';
import { FileIOHelper } from '../../common/utils/helpers/node-helper';
import { ContextKey, setContextKey } from '../../common/vscode/vscode-context';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { TreeItem, TreeView, Uri } from '../../common/vscode/vscode-types';
import {
  getSyncCoordinator,
  invalidateBranchContextCache,
  loadBranchContext,
} from '../../features/branch-context-sync';
import { BaseBranchProvider } from '../_view_base';
import { validateBranchContext } from './config-validator';
import { SectionItem } from './items';
import { ProviderHelpers } from './provider-helpers';
import { SyncManager } from './provider-sync';
import { ValidationIndicator } from './validation-indicator';

const logger = createLogger('BranchContext');

export class BranchContextProvider extends BaseBranchProvider<TreeItem> {
  private lastComparisonBranch = BASE_BRANCH;
  private validationIndicator: ValidationIndicator;
  private descriptionInterval: NodeJS.Timeout | null = null;
  private lastSyncTimestamp: string | null = null;
  private helpers: ProviderHelpers;
  private syncManager: SyncManager;

  constructor(onSyncComplete?: () => void) {
    super();
    this.validationIndicator = new ValidationIndicator();
    this.helpers = new ProviderHelpers();

    const wrappedOnSyncComplete = onSyncComplete
      ? () => {
          logger.info('[BranchContextProvider] onSyncComplete callback invoked, calling BranchTasksProvider.refresh()');
          onSyncComplete();
        }
      : undefined;

    this.syncManager = new SyncManager(
      () => this.currentBranch,
      this.helpers,
      () => this.refresh(),
      (timestamp) => {
        this.lastSyncTimestamp = timestamp;
      },
      wrappedOnSyncComplete,
    );
  }

  setTreeView(treeView: TreeView<TreeItem>) {
    super.setTreeView(treeView);
    this.descriptionInterval = setInterval(() => {
      this.updateDescription();
    }, 60000);
  }

  updateDescription() {
    if (!this.treeView) {
      logger.info('[BranchContext] [updateDescription] No treeView, skipping');
      return;
    }

    if (!this.currentBranch) {
      logger.info('[BranchContext] [updateDescription] No current branch set yet, skipping');
      this.treeView.description = undefined;
      return;
    }

    if (!this.lastSyncTimestamp) {
      logger.info(`[BranchContext] [updateDescription] Loading timestamp from cache for branch: ${this.currentBranch}`);
      const context = loadBranchContext(this.currentBranch);
      this.lastSyncTimestamp = (context.metadata?.lastSyncedTime as string) || null;
      logger.info(`[BranchContext] [updateDescription] Loaded timestamp: ${this.lastSyncTimestamp}`);
    }

    if (this.lastSyncTimestamp) {
      const timestamp = new Date(this.lastSyncTimestamp).getTime();
      const description = formatRelativeTime(timestamp);
      logger.info(
        `[BranchContext] [updateDescription] Setting description: "${description}" (timestamp: ${this.lastSyncTimestamp})`,
      );
      this.treeView.description = description;
    } else {
      logger.info('[BranchContext] [updateDescription] No timestamp available, clearing description');
      this.treeView.description = undefined;
    }
  }

  handleTemplateChange() {
    if (!this.currentBranch) return;
    logger.info('[BranchContextProvider] Template changed, syncing branch context');
    void this.syncBranchContext(this.lastComparisonBranch);
  }

  handleMarkdownChange(uri?: Uri) {
    const coordinator = getSyncCoordinator();
    if (this.syncManager.getIsWritingMarkdown() || this.syncManager.getIsSyncing() || coordinator.isBlocked()) {
      logger.info('[handleMarkdownChange] Ignoring - currently writing/syncing');
      return;
    }

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace || !uri) return;

    const currentBranchPath = ConfigManager.getBranchContextFilePath(workspace, this.currentBranch);

    if (uri.fsPath !== currentBranchPath) {
      logger.info(`[handleMarkdownChange] Ignoring - path mismatch: ${uri.fsPath} !== ${currentBranchPath}`);
      return;
    }

    logger.info(`[handleMarkdownChange] File changed: ${uri.fsPath}, refreshing view`);
    this.refresh();
  }

  handleRootMarkdownChange() {
    logger.info('[handleRootMarkdownChange] Root markdown synced, invalidating cache and refreshing');
    invalidateBranchContextCache(this.currentBranch);
    this.refresh();
  }

  initialize() {
    logger.info('[BranchContextProvider] initialize called');

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) {
      logger.warn('[BranchContextProvider] No workspace found');
      return;
    }

    const config = ConfigManager.loadWorkspaceConfigFromPath(workspace);
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

  getCurrentBranch(): string {
    return this.currentBranch;
  }

  getLastComparisonBranch(): string {
    return this.lastComparisonBranch;
  }

  setBranch(branchName: string, shouldRefresh = true) {
    logger.info(
      `[BranchContextProvider] setBranch called: ${branchName} (current: ${this.currentBranch}, isInitializing: ${this.isInitializing})`,
    );

    if (branchName !== this.currentBranch) {
      this.currentBranch = branchName;

      const workspace = VscodeHelper.getFirstWorkspacePath();
      if (workspace) {
        const branchFilePath = ConfigManager.getBranchContextFilePath(workspace, branchName);
        const fileExists = FileIOHelper.fileExists(branchFilePath);
        logger.info(`[BranchContextProvider] setBranch - File exists: ${fileExists}, path: ${branchFilePath}`);
      }

      if (shouldRefresh && !this.isInitializing) {
        logger.info('[BranchContextProvider] Branch changed, refreshing');
        this.refresh();
      }
    }
  }

  refresh() {
    void setContextKey(ContextKey.BranchContextHideEmptySections, branchContextState.getHideEmptySections());
    this.updateDescription();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (element) return [];

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return [];

    if (!(await Git.isRepository(workspace))) {
      return [VscodeHelper.createTreeItem(NOT_GIT_REPO_MESSAGE)];
    }

    if (!this.currentBranch) {
      this.currentBranch = await Git.getCurrentBranch(workspace);
    }

    const context = loadBranchContext(this.currentBranch);
    const config = this.helpers.loadConfig(workspace);
    const hideEmpty = branchContextState.getHideEmptySections();

    const registry = this.helpers.getSectionRegistry(workspace, config ?? undefined);

    const changedFilesSectionMetadata = context.metadata?.sections?.[SECTION_NAME_CHANGED_FILES];
    let changedFilesValue = BRANCH_CONTEXT_NO_CHANGES;
    if (changedFilesSectionMetadata) {
      const summary = {
        added: (changedFilesSectionMetadata.added as number) || 0,
        modified: (changedFilesSectionMetadata.modified as number) || 0,
        deleted: (changedFilesSectionMetadata.deleted as number) || 0,
        renamed: (changedFilesSectionMetadata.renamed as number) || 0,
      };
      changedFilesValue = Git.formatChangedFilesSummary(summary);
    }

    const items: TreeItem[] = [];
    for (const section of registry.getAllSections()) {
      if (section.name === SECTION_NAME_CHANGED_FILES) {
        continue;
      }

      const value = this.helpers.getSectionValue({
        context,
        sectionName: section.name,
        currentBranch: this.currentBranch,
        changedFilesValue,
      });
      const sectionMetadata = context.metadata?.sections?.[section.name];
      const isEmpty = this.helpers.isSectionEmpty(value, section.type, sectionMetadata);

      if (hideEmpty && isEmpty) {
        continue;
      }

      items.push(new SectionItem(section, value, this.currentBranch, sectionMetadata, context.branchType));
    }

    return items;
  }

  async editField(sectionName: string) {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    const config = this.helpers.loadConfig(workspace);
    const registry = this.helpers.getSectionRegistry(workspace, config ?? undefined);
    const section = registry.get(sectionName);

    const isField = section?.type === SectionType.Field;
    const lineKey = isField ? SECTION_NAME_BRANCH_INFO : sectionName;
    await this.openMarkdownFileAtLine(lineKey);
  }

  async openMarkdownFile() {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    const filePath = ConfigManager.getRootBranchContextFilePath(workspace);
    const uri = VscodeHelper.createFileUri(filePath);
    await VscodeHelper.openDocument(uri);
  }

  async openMarkdownFileAtLine(fieldName: string) {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    const filePath = ConfigManager.getRootBranchContextFilePath(workspace);
    const lineNumber = MarkdownHelper.getFieldLineNumber(filePath, fieldName);
    const uri = VscodeHelper.createFileUri(filePath);
    await VscodeHelper.openDocumentAtLine(uri, lineNumber);
  }

  async syncBranchContext(comparisonBranch: string) {
    this.lastComparisonBranch = comparisonBranch;

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace || !ConfigManager.configDirExists(workspace)) {
      logger.info('[syncBranchContext] No config directory, skipping');
      return;
    }

    await this.syncManager.syncBranchContext(comparisonBranch);
    this.isInitializing = false;
  }

  dispose() {
    super.dispose();
    if (this.descriptionInterval) {
      clearInterval(this.descriptionInterval);
      this.descriptionInterval = null;
    }
    this.validationIndicator.dispose();
    this.syncManager.dispose();
  }
}
