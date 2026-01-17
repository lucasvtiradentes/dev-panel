import { BASE_BRANCH, FILE_WATCHER_DEBOUNCE_MS } from '../../common/constants';
import { StoreKey, extensionStore } from '../../common/core/extension-store';
import { createLogger } from '../../common/lib/logger';
import { FileIOHelper, NodePathHelper, ShellHelper } from '../../common/utils/helpers/node-helper';
import { ContextKey, setContextKey } from '../../common/vscode/vscode-context';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { TreeDataProvider, TreeItem, TreeView, Uri } from '../../common/vscode/vscode-types';
import { loadBranchContext } from '../_branch_base';
import { ChangedFilesParser, type ParseResult } from './changed-files-parser';
import { ChangedFilesTreeBuilder } from './tree-builder';
import type { BranchChangedFilesTreeItem, TopicNode } from './tree-items';

const logger = createLogger('BranchChangedFiles');

type SyncCallback = (comparisonBranch: string) => Promise<void>;

export class BranchChangedFilesProvider implements TreeDataProvider<BranchChangedFilesTreeItem> {
  private _onDidChangeTreeData = VscodeHelper.createEventEmitter<BranchChangedFilesTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentBranch = '';
  private comparisonBranch = BASE_BRANCH;
  private cachedTopics: TopicNode[] = [];
  private cachedMetadata: ParseResult['metadata'] | null = null;
  private grouped = true;
  private fileChangeDebounce: NodeJS.Timeout | null = null;
  private treeView: TreeView<BranchChangedFilesTreeItem> | null = null;
  private syncCallback: SyncCallback | null = null;
  private lastChangedFilesHash = '';
  private lastManualRefreshTime = 0;

  constructor() {
    void setContextKey(ContextKey.BranchChangedFilesGrouped, this.grouped);
  }

  setSyncCallback(callback: SyncCallback) {
    this.syncCallback = callback;
  }

  setTreeView(treeView: TreeView<BranchChangedFilesTreeItem>) {
    this.treeView = treeView;
    this.updateDescription();
  }

  private updateDescription() {
    if (!this.treeView) return;

    if (this.cachedMetadata && !this.cachedMetadata.isEmpty) {
      this.treeView.description = `${this.cachedMetadata.summary} (${this.comparisonBranch})`;
    } else {
      this.treeView.description = undefined;
    }
  }

  getComparisonBranch(): string {
    return this.comparisonBranch;
  }

  async setComparisonBranch(branch: string) {
    if (branch === this.comparisonBranch) return;
    this.comparisonBranch = branch;
    this.updateDescription();
    await this.syncChangedFiles();
  }

  toggleGroupMode() {
    this.grouped = !this.grouped;
    void setContextKey(ContextKey.BranchChangedFilesGrouped, this.grouped);
    this.refresh();
  }

  async syncChangedFiles() {
    if (this.syncCallback) {
      logger.info(`[syncChangedFiles] Triggering branch context sync with comparison branch: ${this.comparisonBranch}`);
      await this.syncCallback(this.comparisonBranch);
    } else {
      logger.warn('[syncChangedFiles] No sync callback configured');
    }
  }

  setBranch(branchName: string) {
    logger.info(`[setBranch] Called with '${branchName}', current='${this.currentBranch}'`);
    if (branchName !== this.currentBranch) {
      logger.info(`[setBranch] Branch changed from '${this.currentBranch}' to '${branchName}'`);
      this.currentBranch = branchName;
      this.lastChangedFilesHash = '';
      this.refresh();
    }
  }

  handleMarkdownChange(uri: Uri) {
    logger.info(`[handleMarkdownChange] Called. currentBranch='${this.currentBranch}', uri=${uri.fsPath}`);

    if (extensionStore.get(StoreKey.IsWritingBranchContext)) {
      logger.info(`[handleMarkdownChange] Ignoring file change during sync: ${uri.fsPath}`);
      return;
    }

    const context = loadBranchContext(this.currentBranch);
    logger.info(`[handleMarkdownChange] context.changedFiles length=${context.changedFiles?.length ?? 'null'}`);

    const newHash = this.computeHash(context.changedFiles || '');
    logger.info(`[handleMarkdownChange] newHash='${newHash}', lastHash='${this.lastChangedFilesHash}'`);

    if (newHash === this.lastChangedFilesHash) {
      logger.info('[handleMarkdownChange] CHANGED FILES section unchanged, skipping refresh');
      return;
    }

    logger.info('[handleMarkdownChange] Hash changed, scheduling refresh');

    if (this.fileChangeDebounce) {
      clearTimeout(this.fileChangeDebounce);
    }

    this.fileChangeDebounce = setTimeout(() => {
      logger.info('[handleMarkdownChange] Debounce fired, calling refresh()');
      this.refresh();
      this.fileChangeDebounce = null;
    }, FILE_WATCHER_DEBOUNCE_MS);
  }

  private computeHash(content: string): string {
    return `${content.length}:${content.slice(0, 50)}:${content.slice(-50)}`;
  }

  private resetState() {
    this.cachedTopics = [];
    this.cachedMetadata = null;
    this.lastChangedFilesHash = '';
    this.updateDescription();
  }

  refresh() {
    logger.info(`[refresh] Called. currentBranch='${this.currentBranch}'`);
    this.lastManualRefreshTime = Date.now();
    this.loadChangedFiles();
    this._onDidChangeTreeData.fire(undefined);
  }

  private shouldSkipRefresh(): boolean {
    const timeSinceManualRefresh = Date.now() - this.lastManualRefreshTime;
    return timeSinceManualRefresh < FILE_WATCHER_DEBOUNCE_MS * 2;
  }

  refreshIfNeeded() {
    if (!this.shouldSkipRefresh()) {
      this.refresh();
    }
  }

  private loadChangedFiles() {
    logger.info(`[loadChangedFiles] Called. currentBranch='${this.currentBranch}'`);

    if (!this.currentBranch) {
      logger.warn('[loadChangedFiles] No current branch');
      this.resetState();
      return;
    }

    const context = loadBranchContext(this.currentBranch);
    const changedFilesContent = context.changedFiles;
    logger.info(`[loadChangedFiles] changedFilesContent length=${changedFilesContent?.length ?? 'null'}`);

    if (!changedFilesContent) {
      logger.warn('[loadChangedFiles] No changed files in branch context');
      this.resetState();
      return;
    }

    const result = ChangedFilesParser.parseFromMarkdown(changedFilesContent);
    this.cachedTopics = result.topics;
    this.cachedMetadata = result.metadata;
    this.lastChangedFilesHash = this.computeHash(changedFilesContent);
    logger.info(`[loadChangedFiles] Loaded ${result.topics.length} topics, hash='${this.lastChangedFilesHash}'`);
    this.updateDescription();
  }

  getTreeItem(element: BranchChangedFilesTreeItem): TreeItem {
    return element;
  }

  getChildren(element?: BranchChangedFilesTreeItem): BranchChangedFilesTreeItem[] {
    if (!this.currentBranch) {
      return [];
    }

    return ChangedFilesTreeBuilder.getChildren(element, this.cachedTopics, this.grouped);
  }

  async openFile(filePath: string) {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    const fullPath = NodePathHelper.join(workspace, filePath);
    if (!FileIOHelper.fileExists(fullPath)) {
      logger.warn(`[openFile] File does not exist: ${fullPath}`);
      return;
    }

    const uri = VscodeHelper.createFileUri(fullPath);
    await VscodeHelper.openDocument(uri);
  }

  async openDiff(filePath: string, status: string) {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    const fullPath = NodePathHelper.join(workspace, filePath);
    const fileUri = VscodeHelper.createFileUri(fullPath);

    if (status === 'A') {
      await VscodeHelper.openDocument(fileUri);
      return;
    }

    if (status === 'D') {
      const baseRef = this.getBaseBranch(workspace);
      try {
        const gitUri = this.createGitUri(fullPath, filePath, baseRef);
        await VscodeHelper.openDocument(gitUri);
      } catch {
        // Deleted file not found
      }
      return;
    }

    const hasUncommitted = this.hasUncommittedChanges(workspace, filePath);

    if (hasUncommitted) {
      await VscodeHelper.executeCommand('git.openChange', fileUri);
    } else {
      const baseRef = this.getBaseBranch(workspace);
      const gitUri = this.createGitUri(fullPath, filePath, baseRef);
      const title = `${filePath} (${baseRef} ↔ Current)`;
      await VscodeHelper.showDiff(gitUri, fileUri, title);
    }
  }

  private createGitUri(fullPath: string, relativePath: string, ref: string) {
    const params = JSON.stringify({ path: fullPath, ref });
    return VscodeHelper.parseUri(`git:/${relativePath}?${params}`);
  }

  private hasUncommittedChanges(workspace: string, filePath: string): boolean {
    try {
      const result = ShellHelper.execSync(`git status --porcelain -- "${filePath}"`, workspace);
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  private getBaseBranch(workspace: string): string {
    const possibleBases = ['origin/main', 'origin/master', 'main', 'master'];

    for (const base of possibleBases) {
      if (ShellHelper.execSyncSilent(`git rev-parse --verify ${base}`, workspace)) {
        return base;
      }
    }

    return 'HEAD~10';
  }

  dispose() {
    if (this.fileChangeDebounce) {
      clearTimeout(this.fileChangeDebounce);
    }
  }
}
