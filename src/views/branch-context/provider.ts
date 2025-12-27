import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  BRANCH_CONTEXT_NO_CHANGES,
  NOT_GIT_REPO_MESSAGE,
  SECTION_NAME_BRANCH,
  SECTION_NAME_BRANCH_INFO,
  SECTION_NAME_CHANGED_FILES,
  SECTION_NAME_LINEAR_LINK,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_PR_LINK,
  SECTION_NAME_REQUIREMENTS,
} from '../../common/constants';
import { ROOT_BRANCH_CONTEXT_FILE_NAME } from '../../common/constants/scripts-constants';
import {
  configDirExists,
  getBranchContextFilePath as getBranchContextFilePathUtil,
  getGitExcludeFilePath,
  getRootBranchContextFilePath,
  loadWorkspaceConfigFromPath,
} from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import { ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import { branchContextState } from '../../common/lib/workspace-state';
import { formatRelativeTime } from '../../common/utils/time-formatter';
import { getFirstWorkspacePath } from '../../common/utils/workspace-utils';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { TreeItem, TreeView, Uri } from '../../common/vscode/vscode-types';
import { createTaskProvider, loadBranchContext } from '../_branch_base';
import { formatChangedFilesSummary } from '../_branch_base/providers/default/file-changes-utils';
import { getFieldLineNumber } from '../_branch_base/storage/markdown-parser';
import { getCurrentBranch, isGitRepository } from '../replacements/git-utils';
import { validateBranchContext } from './config-validator';
import { SectionItem } from './items';
import { ProviderHelpers } from './provider-helpers';
import { SyncManager } from './provider-sync';
import { ValidationIndicator } from './validation-indicator';

const logger = createLogger('BranchContext');

export class BranchContextProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentBranch = '';
  private validationIndicator: ValidationIndicator;
  private treeView: TreeView<TreeItem> | null = null;
  private descriptionInterval: NodeJS.Timeout | null = null;
  private lastSyncTimestamp: string | null = null;
  private helpers: ProviderHelpers;
  private syncManager: SyncManager;
  private taskProvider;
  private isInitializing = true;

  constructor(onSyncComplete?: () => void) {
    this.validationIndicator = new ValidationIndicator();
    this.helpers = new ProviderHelpers();

    const workspace = getFirstWorkspacePath();
    const config = workspace ? loadWorkspaceConfigFromPath(workspace) : null;
    const tasksConfig = config?.branchContext?.builtinSections?.tasks;
    this.taskProvider = createTaskProvider(tasksConfig, workspace ?? undefined);

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
    this.treeView = treeView;
    this.updateDescription();
    this.descriptionInterval = setInterval(() => {
      this.updateDescription();
    }, 60000);
  }

  private updateDescription() {
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

  handleTemplateChange() {
    if (!this.currentBranch) return;
    logger.info('[BranchContextProvider] Template changed, syncing branch context');
    void this.syncBranchContext();
  }

  handleMarkdownChange(uri?: Uri) {
    if (this.syncManager.getIsWritingMarkdown() || this.syncManager.getIsSyncing()) {
      logger.info('[handleMarkdownChange] Ignoring - currently writing/syncing');
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace || !uri) return;

    const currentBranchPath = getBranchContextFilePathUtil(workspace, this.currentBranch);

    if (uri.fsPath !== currentBranchPath) {
      logger.info(`[handleMarkdownChange] Ignoring - path mismatch: ${uri.fsPath} !== ${currentBranchPath}`);
      return;
    }

    logger.info(`[handleMarkdownChange] Syncing branch to root: ${uri.fsPath}`);
    this.syncManager.debouncedSync(() => this.syncManager.syncBranchToRoot(), true);
  }

  handleRootMarkdownChange() {
    if (this.syncManager.getIsWritingMarkdown() || this.syncManager.getIsSyncing()) {
      logger.info('[handleRootMarkdownChange] Ignoring - currently writing/syncing');
      return;
    }

    logger.info('[handleRootMarkdownChange] Syncing root to branch');
    this.syncManager.debouncedSync(() => this.syncManager.syncRootToBranch(), true);
  }

  async initialize() {
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

  private addToGitExclude(workspace: string) {
    const excludePath = getGitExcludeFilePath(workspace);
    if (!fs.existsSync(excludePath)) return;

    try {
      const content = fs.readFileSync(excludePath, 'utf-8');

      if (content.includes(ROOT_BRANCH_CONTEXT_FILE_NAME)) return;

      const newContent = content.endsWith('\n')
        ? `${content}${ROOT_BRANCH_CONTEXT_FILE_NAME}\n`
        : `${content}\n${ROOT_BRANCH_CONTEXT_FILE_NAME}\n`;
      fs.writeFileSync(excludePath, newContent);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to update .git/info/exclude: ${message}`);
    }
  }

  getCurrentBranch(): string {
    return this.currentBranch;
  }

  setBranch(branchName: string, shouldRefresh = true) {
    logger.info(
      `[BranchContextProvider] setBranch called: ${branchName} (current: ${this.currentBranch}, isInitializing: ${this.isInitializing})`,
    );

    if (branchName !== this.currentBranch) {
      this.currentBranch = branchName;
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

    const workspace = getFirstWorkspacePath();
    if (!workspace) return [];

    if (!(await isGitRepository(workspace))) {
      return [new vscode.TreeItem(NOT_GIT_REPO_MESSAGE)];
    }

    if (!this.currentBranch) {
      this.currentBranch = await getCurrentBranch(workspace);
    }

    const context = loadBranchContext(this.currentBranch);
    const config = this.helpers.loadConfig(workspace);
    const hideEmpty = branchContextState.getHideEmptySections();
    const showChangedFiles = config?.branchContext?.builtinSections?.changedFiles ?? true;

    const registry = this.helpers.getSectionRegistry(workspace, config ?? undefined, showChangedFiles);

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
    const syncContext = {
      branchName: this.currentBranch,
      workspacePath: workspace,
      markdownPath,
      branchContext: context,
    };
    const taskStats = await this.taskProvider.getTaskStats(syncContext);
    const tasksValue = taskStats.total > 0 ? `${taskStats.completed}/${taskStats.total}` : undefined;

    const items: TreeItem[] = [];
    for (const section of registry.getAllSections()) {
      const value = this.helpers.getSectionValue({
        context,
        sectionName: section.name,
        currentBranch: this.currentBranch,
        changedFilesValue,
        tasksValue,
      });
      const sectionMetadata = context.metadata?.sections?.[section.name];

      if (hideEmpty && this.helpers.isSectionEmpty(value, section.type, sectionMetadata)) {
        continue;
      }

      items.push(new SectionItem(section, value, this.currentBranch, sectionMetadata, context.branchType));
    }

    return items;
  }

  async editField(_branchName: string, sectionName: string, _currentValue: string | undefined) {
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

  async openMarkdownFile() {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const filePath = getRootBranchContextFilePath(workspace);
    const uri = vscode.Uri.file(filePath);
    await VscodeHelper.openDocument(uri);
  }

  async openMarkdownFileAtLine(fieldName: string) {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    const filePath = getRootBranchContextFilePath(workspace);
    const lineNumber = getFieldLineNumber(filePath, fieldName);
    const uri = vscode.Uri.file(filePath);
    await VscodeHelper.openDocumentAtLine(uri, lineNumber);
  }

  async syncBranchContext() {
    const workspace = getFirstWorkspacePath();
    if (!workspace || !configDirExists(workspace)) {
      logger.info('[syncBranchContext] No config directory, skipping');
      return;
    }

    await this.syncManager.syncBranchContext();
    this.isInitializing = false;
  }

  dispose() {
    if (this.descriptionInterval) {
      clearInterval(this.descriptionInterval);
      this.descriptionInterval = null;
    }
    this.validationIndicator.dispose();
    this.syncManager.dispose();
  }
}
