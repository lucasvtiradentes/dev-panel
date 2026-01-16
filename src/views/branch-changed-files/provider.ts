import { FILE_WATCHER_DEBOUNCE_MS, SECTION_NAME_CHANGED_FILES } from '../../common/constants';
import { ConfigManager } from '../../common/core/config-manager';
import { StoreKey, extensionStore } from '../../common/core/extension-store';
import { createLogger } from '../../common/lib/logger';
import { MarkdownHelper } from '../../common/utils/helpers/markdown-helper';
import { FileIOHelper, NodePathHelper, ShellHelper } from '../../common/utils/helpers/node-helper';
import { ContextKey, setContextKey } from '../../common/vscode/vscode-context';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { TreeDataProvider, TreeItem, TreeView, Uri } from '../../common/vscode/vscode-types';
import { ChangedFilesParser, type ParseResult } from './changed-files-parser';
import { ChangedFilesTreeBuilder } from './tree-builder';
import type { BranchChangedFilesTreeItem, TopicNode } from './tree-items';

const logger = createLogger('BranchChangedFiles');

type SyncCallback = () => Promise<void>;

export class BranchChangedFilesProvider implements TreeDataProvider<BranchChangedFilesTreeItem> {
  private _onDidChangeTreeData = VscodeHelper.createEventEmitter<BranchChangedFilesTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentBranch = '';
  private cachedTopics: TopicNode[] = [];
  private cachedMetadata: ParseResult['metadata'] | null = null;
  private grouped = true;
  private fileChangeDebounce: NodeJS.Timeout | null = null;
  private treeView: TreeView<BranchChangedFilesTreeItem> | null = null;
  private syncCallback: SyncCallback | null = null;

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
      this.treeView.description = this.cachedMetadata.summary;
    } else {
      this.treeView.description = undefined;
    }
  }

  toggleGroupMode() {
    this.grouped = !this.grouped;
    void setContextKey(ContextKey.BranchChangedFilesGrouped, this.grouped);
    this.refresh();
  }

  async syncChangedFiles() {
    if (this.syncCallback) {
      logger.info('[syncChangedFiles] Triggering branch context sync');
      await this.syncCallback();
    } else {
      logger.warn('[syncChangedFiles] No sync callback configured');
    }
  }

  setBranch(branchName: string) {
    if (branchName !== this.currentBranch) {
      logger.info(`[setBranch] Branch changed from '${this.currentBranch}' to '${branchName}'`);
      this.currentBranch = branchName;
      this.refresh();
    }
  }

  handleMarkdownChange(uri: Uri) {
    if (extensionStore.get(StoreKey.IsWritingBranchContext)) {
      logger.info(`[handleMarkdownChange] Ignoring file change during sync: ${uri.fsPath}`);
      return;
    }

    logger.info(`[handleMarkdownChange] File changed: ${uri.fsPath}`);

    if (this.fileChangeDebounce) {
      clearTimeout(this.fileChangeDebounce);
    }

    this.fileChangeDebounce = setTimeout(() => {
      this.refresh();
      this.fileChangeDebounce = null;
    }, FILE_WATCHER_DEBOUNCE_MS);
  }

  refresh() {
    this.loadChangedFiles();
    this._onDidChangeTreeData.fire(undefined);
  }

  private loadChangedFiles() {
    if (!this.currentBranch) {
      logger.warn('[loadChangedFiles] No current branch');
      this.cachedTopics = [];
      this.cachedMetadata = null;
      this.updateDescription();
      return;
    }

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) {
      logger.warn('[loadChangedFiles] No workspace');
      this.cachedTopics = [];
      this.cachedMetadata = null;
      this.updateDescription();
      return;
    }

    const filePath = ConfigManager.getBranchContextFilePath(workspace, this.currentBranch);
    const content = FileIOHelper.readFileIfExists(filePath);
    if (!content) {
      logger.warn('[loadChangedFiles] No branch context file');
      this.cachedTopics = [];
      this.cachedMetadata = null;
      this.updateDescription();
      return;
    }

    const changedFilesContent = MarkdownHelper.extractSection(content, SECTION_NAME_CHANGED_FILES);
    const result = ChangedFilesParser.parseFromMarkdown(changedFilesContent);

    this.cachedTopics = result.topics;
    this.cachedMetadata = result.metadata;
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
