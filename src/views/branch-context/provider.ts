import * as vscode from 'vscode';
import { CONFIG_DIR_NAME } from '../../common/constants';
import { getCurrentBranch, isGitRepository } from '../replacements/git-utils';
import { BranchContextField, BranchContextFieldItem, BranchHeaderItem } from './items';
import { generateBranchContextMarkdown } from './markdown-generator';
import { getBranchContextFilePath, getFieldLineNumber, parseBranchContextMarkdown } from './markdown-parser';
import { loadBranchContext, saveBranchContext } from './state';

type GitAPI = {
  repositories: GitRepository[];
  onDidOpenRepository: vscode.Event<GitRepository>;
};

type GitRepository = {
  state: {
    HEAD?: { name?: string };
  };
  onDidCheckout: vscode.Event<void>;
};

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

async function getGitAPI(): Promise<GitAPI | null> {
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  if (!gitExtension) {
    return null;
  }
  if (!gitExtension.isActive) {
    await gitExtension.activate();
  }
  return gitExtension.exports.getAPI(1);
}

export class BranchContextProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];
  private stateWatcher: vscode.FileSystemWatcher | null = null;
  private markdownWatcher: vscode.FileSystemWatcher | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private currentBranch = '';
  private isWritingMarkdown = false;

  constructor() {
    this.setupGitWatcher();
    this.setupStateWatcher();
    this.setupMarkdownWatcher();
    this.setupHeadFileWatcher();
    this.setupPolling();
    this.initializeBranch();
  }

  private async setupGitWatcher(): Promise<void> {
    const gitAPI = await getGitAPI();
    if (!gitAPI) {
      return;
    }

    for (const repo of gitAPI.repositories) {
      this.attachRepoListeners(repo);
    }

    this.disposables.push(
      gitAPI.onDidOpenRepository((repo) => {
        this.attachRepoListeners(repo);
      }),
    );
  }

  private attachRepoListeners(repo: GitRepository): void {
    this.disposables.push(
      repo.onDidCheckout(() => {
        this.handleBranchChange();
      }),
    );

    const branchName = repo.state.HEAD?.name;
    if (branchName && !this.currentBranch) {
      this.currentBranch = branchName;
      this.regenerateMarkdown().then(() => this.refresh());
    }
  }

  private setupHeadFileWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    const headWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, '.git/HEAD'));

    headWatcher.onDidChange(() => this.handleBranchChange());
    this.disposables.push(headWatcher);
  }

  private setupPolling(): void {
    this.pollInterval = setInterval(() => {
      this.handleBranchChange();
    }, 2000);
  }

  private setupStateWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    this.stateWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, `${CONFIG_DIR_NAME}/state.json`),
    );

    this.stateWatcher.onDidChange(() => this.refresh());
  }

  private setupMarkdownWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    this.markdownWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, '.branch-context.md'),
    );

    this.markdownWatcher.onDidChange(() => this.handleMarkdownChange());
  }

  private handleMarkdownChange(): void {
    if (this.isWritingMarkdown) return;

    const parsed = parseBranchContextMarkdown();
    if (!parsed) return;

    if (parsed.branchName === this.currentBranch) {
      saveBranchContext(this.currentBranch, parsed.context);
      this.refresh();
    }
  }

  private async initializeBranch(): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    if (await isGitRepository(workspace)) {
      this.currentBranch = await getCurrentBranch(workspace);
      await this.regenerateMarkdown();
      this.refresh();
    }
  }

  private async handleBranchChange(): Promise<void> {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    try {
      const newBranch = await getCurrentBranch(workspace);
      if (newBranch !== this.currentBranch) {
        this.currentBranch = newBranch;
        await this.regenerateMarkdown();
        this.refresh();
      }
    } catch {
      // Ignore errors during branch detection
    }
  }

  private async regenerateMarkdown(): Promise<void> {
    if (!this.currentBranch) return;
    const context = loadBranchContext(this.currentBranch);
    this.isWritingMarkdown = true;
    try {
      await generateBranchContextMarkdown(this.currentBranch, context);
    } finally {
      setTimeout(() => {
        this.isWritingMarkdown = false;
      }, 100);
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
      new BranchContextFieldItem(BranchContextField.Notes, context.notes, this.currentBranch),
    ];
  }

  async editField(_branchName: string, field: BranchContextField, _currentValue: string | undefined): Promise<void> {
    const fieldLineMap: Record<BranchContextField, string | null> = {
      [BranchContextField.PrLink]: 'PR LINK',
      [BranchContextField.LinearLink]: 'LINEAR LINK',
      [BranchContextField.Objective]: 'OBJECTIVE',
      [BranchContextField.Notes]: 'NOTES',
    };

    const lineKey = fieldLineMap[field];
    if (lineKey) {
      await this.openMarkdownFileAtLine(lineKey);
    }
  }

  async openMarkdownFile(): Promise<void> {
    const filePath = getBranchContextFilePath();
    if (!filePath) return;

    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri);
  }

  async openMarkdownFileAtLine(fieldName: string): Promise<void> {
    const filePath = getBranchContextFilePath();
    if (!filePath) return;

    const lineNumber = getFieldLineNumber(fieldName);
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      selection: new vscode.Range(lineNumber, 0, lineNumber, 0),
    });
  }

  dispose(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this.stateWatcher?.dispose();
    this.markdownWatcher?.dispose();
  }
}
