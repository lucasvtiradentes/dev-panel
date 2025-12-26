import * as fs from 'node:fs';
import * as path from 'node:path';
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
  loadWorkspaceConfigFromPath,
} from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import { ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import { branchContextState } from '../../common/lib/workspace-state';
import { formatRelativeTime } from '../../common/utils/time-formatter';
import { getFirstWorkspacePath } from '../../common/utils/workspace-utils';
import { getCurrentBranch, isGitRepository } from '../replacements/git-utils';
import { validateBranchContext } from './config-validator';
import { formatChangedFilesSummary } from './git-changed-files';
import { SectionItem } from './items';
import { getFieldLineNumber } from './markdown-parser';
import { ProviderHelpers } from './provider-helpers';
import { SyncManager } from './provider-sync';
import { createTaskProvider } from './providers';
import { loadBranchContext } from './state';
import { ValidationIndicator } from './validation-indicator';

const logger = createLogger('BranchContext');

export class BranchContextProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentBranch = '';
  private validationIndicator: ValidationIndicator;
  private treeView: vscode.TreeView<vscode.TreeItem> | null = null;
  private descriptionInterval: NodeJS.Timeout | null = null;
  private lastSyncTimestamp: string | null = null;
  private helpers: ProviderHelpers;
  private syncManager: SyncManager;
  private taskProvider;

  constructor() {
    this.validationIndicator = new ValidationIndicator();
    this.helpers = new ProviderHelpers();

    const workspace = getFirstWorkspacePath();
    const config = workspace ? loadWorkspaceConfigFromPath(workspace) : null;
    const tasksConfig = config?.branchContext?.builtinSections?.tasks;
    this.taskProvider = createTaskProvider(tasksConfig, workspace ?? undefined);

    this.syncManager = new SyncManager(
      () => this.currentBranch,
      this.helpers,
      () => this.refresh(),
      (timestamp) => {
        this.lastSyncTimestamp = timestamp;
      },
    );
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
    if (this.syncManager.getIsWritingMarkdown() || this.syncManager.getIsSyncing()) {
      return;
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace || !uri) return;

    const currentBranchPath = getBranchContextFilePathUtil(workspace, this.currentBranch);

    if (uri.fsPath !== currentBranchPath) {
      return;
    }

    this.syncManager.debouncedSync(() => this.syncManager.syncBranchToRoot());
  }

  handleRootMarkdownChange(): void {
    if (this.syncManager.getIsWritingMarkdown() || this.syncManager.getIsSyncing()) {
      return;
    }

    this.syncManager.debouncedSync(() => this.syncManager.syncRootToBranch());
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

    const items: vscode.TreeItem[] = [];
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

    const filePath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri);
  }

  async openMarkdownFileAtLine(fieldName: string) {
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

  async syncBranchContext() {
    const workspace = getFirstWorkspacePath();
    if (!workspace || !configDirExists(workspace)) {
      logger.info('[syncBranchContext] No config directory, skipping');
      return;
    }

    await this.syncManager.syncBranchContext();
  }

  dispose(): void {
    if (this.descriptionInterval) {
      clearInterval(this.descriptionInterval);
      this.descriptionInterval = null;
    }
    this.validationIndicator.dispose();
    this.syncManager.dispose();
  }
}
