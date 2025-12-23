import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { ROOT_BRANCH_CONTEXT_FILE_NAME } from '../../common/constants/scripts-constants';
import {
  getBranchContextFilePath as getBranchContextFilePathUtil,
  getBranchContextGlobPattern,
} from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import { getCurrentBranch, isGitRepository } from '../replacements/git-utils';
import { ensureBranchDirectory } from './file-storage';
import { BranchContextField, BranchContextFieldItem, BranchHeaderItem } from './items';
import { generateBranchContextMarkdown } from './markdown-generator';
import { getBranchContextFilePath, getFieldLineNumber } from './markdown-parser';
import { loadBranchContext } from './state';

const logger = createLogger('BranchContext');

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export class BranchContextProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private markdownWatcher: vscode.FileSystemWatcher | null = null;
  private rootMarkdownWatcher: vscode.FileSystemWatcher | null = null;
  private currentBranch = '';
  private isWritingMarkdown = false;
  private isSyncing = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private lastSyncDirection: 'root-to-branch' | 'branch-to-root' | null = null;

  constructor() {
    this.setupMarkdownWatcher();
    this.setupRootMarkdownWatcher();
    this.initializeBranch();
  }

  private setupMarkdownWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    const globPattern = getBranchContextGlobPattern();
    this.markdownWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, globPattern));

    this.markdownWatcher.onDidChange((uri) => this.handleMarkdownChange(uri));
    this.markdownWatcher.onDidCreate((uri) => this.handleMarkdownChange(uri));
  }

  private setupRootMarkdownWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    this.rootMarkdownWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME),
    );

    this.rootMarkdownWatcher.onDidChange(() => this.handleRootMarkdownChange());
    this.rootMarkdownWatcher.onDidCreate(() => this.handleRootMarkdownChange());
  }

  private handleMarkdownChange(uri?: vscode.Uri): void {
    if (this.isWritingMarkdown || this.isSyncing) {
      return;
    }

    const workspace = getWorkspacePath();
    if (!workspace || !uri) return;

    const currentBranchPath = getBranchContextFilePathUtil(workspace, this.currentBranch);

    if (uri.fsPath !== currentBranchPath) {
      return;
    }

    this.debouncedSync(() => this.syncBranchToRoot());
  }

  private handleRootMarkdownChange(): void {
    if (this.isWritingMarkdown || this.isSyncing) {
      return;
    }

    this.debouncedSync(() => this.syncRootToBranch());
  }

  private async initializeBranch(): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    if (await isGitRepository(workspace)) {
      this.addToGitExclude(workspace);
      this.currentBranch = await getCurrentBranch(workspace);
      void this.regenerateMarkdown();
      this.refresh();
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

  setBranch(branchName: string): void {
    if (branchName !== this.currentBranch) {
      this.currentBranch = branchName;
      void this.regenerateMarkdown();
      this.refresh();
    }
  }

  private async regenerateMarkdown(): Promise<void> {
    if (!this.currentBranch) return;

    const workspace = getWorkspacePath();
    if (!workspace) return;

    const context = loadBranchContext(this.currentBranch);
    this.isWritingMarkdown = true;
    try {
      ensureBranchDirectory(workspace, this.currentBranch);
      await generateBranchContextMarkdown(this.currentBranch, context);
      this.syncBranchToRoot();
    } finally {
      setTimeout(() => {
        this.isWritingMarkdown = false;
      }, 100);
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
    }, 200);
  }

  private syncRootToBranch(): void {
    if (!this.currentBranch) {
      return;
    }

    if (this.lastSyncDirection === 'root-to-branch') {
      this.lastSyncDirection = null;
      return;
    }

    const workspace = getWorkspacePath();
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

    const workspace = getWorkspacePath();
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
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element) return [];

    const workspace = getWorkspacePath();
    if (!workspace) return [];

    if (!(await isGitRepository(workspace))) {
      return [new vscode.TreeItem('Not a git repository')];
    }

    if (!this.currentBranch) {
      this.currentBranch = await getCurrentBranch(workspace);
    }

    const context = loadBranchContext(this.currentBranch);

    return [
      new BranchHeaderItem(this.currentBranch),
      new BranchContextFieldItem(BranchContextField.PrLink, context.prLink, this.currentBranch),
      new BranchContextFieldItem(BranchContextField.LinearLink, context.linearLink, this.currentBranch),
      new BranchContextFieldItem(BranchContextField.Objective, context.objective, this.currentBranch),
      new BranchContextFieldItem(BranchContextField.Requirements, context.requirements, this.currentBranch),
      new BranchContextFieldItem(BranchContextField.Notes, context.notes, this.currentBranch),
    ];
  }

  async editField(_branchName: string, field: BranchContextField, _currentValue: string | undefined): Promise<void> {
    const fieldLineMap: Record<BranchContextField, string | null> = {
      [BranchContextField.PrLink]: 'PR LINK',
      [BranchContextField.LinearLink]: 'LINEAR LINK',
      [BranchContextField.Objective]: 'OBJECTIVE',
      [BranchContextField.Requirements]: 'REQUIREMENTS',
      [BranchContextField.Notes]: 'NOTES',
    };

    const lineKey = fieldLineMap[field];
    if (lineKey) {
      await this.openMarkdownFileAtLine(lineKey);
    }
  }

  async openMarkdownFile(): Promise<void> {
    const filePath = getBranchContextFilePath(this.currentBranch);
    if (!filePath) return;

    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri);
  }

  async openMarkdownFileAtLine(fieldName: string): Promise<void> {
    const filePath = getBranchContextFilePath(this.currentBranch);
    if (!filePath) return;

    const lineNumber = getFieldLineNumber(this.currentBranch, fieldName);
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      selection: new vscode.Range(lineNumber, 0, lineNumber, 0),
    });
  }

  async refreshChangedFiles(): Promise<void> {
    if (!this.currentBranch) return;

    const workspace = getWorkspacePath();
    if (!workspace) return;

    const context = loadBranchContext(this.currentBranch);
    this.isWritingMarkdown = true;

    try {
      await generateBranchContextMarkdown(this.currentBranch, { ...context, changedFiles: undefined });
      this.syncBranchToRoot();
    } finally {
      setTimeout(() => {
        this.isWritingMarkdown = false;
      }, 100);
    }
  }

  dispose(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    this.markdownWatcher?.dispose();
    this.rootMarkdownWatcher?.dispose();
  }
}
