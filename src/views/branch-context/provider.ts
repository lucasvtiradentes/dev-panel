import * as vscode from 'vscode';
import type { BranchContext } from '../../common/types';
import { getCurrentBranch, isGitRepository } from '../replacements/git-utils';
import { BranchContextFieldItem, BranchHeaderItem } from './items';
import { generateBranchContextMarkdown } from './markdown-generator';
import { loadBranchContext, updateBranchField } from './state';

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
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private currentBranch = '';

  constructor() {
    this.setupGitWatcher();
    this.setupStateWatcher();
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
      new vscode.RelativePattern(workspace, '.bpm/state.json'),
    );

    this.stateWatcher.onDidChange(() => this.refresh());
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
    await generateBranchContextMarkdown(this.currentBranch, context);
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
      new BranchContextFieldItem('objective', context.objective, this.currentBranch),
      new BranchContextFieldItem('linearIssue', context.linearIssue, this.currentBranch),
      new BranchContextFieldItem('notes', context.notes, this.currentBranch),
    ];
  }

  async editField(branchName: string, field: keyof BranchContext, currentValue: string | undefined): Promise<void> {
    const label = field === 'linearIssue' ? 'Linear Issue' : field.charAt(0).toUpperCase() + field.slice(1);

    const newValue = await vscode.window.showInputBox({
      prompt: `Enter ${label} for branch "${branchName}"`,
      value: currentValue ?? '',
      placeHolder:
        field === 'linearIssue' ? 'e.g., ABC-123 or https://linear.app/...' : `Enter ${label.toLowerCase()}...`,
    });

    if (newValue !== undefined) {
      updateBranchField(branchName, field, newValue === '' ? undefined : newValue);
      await this.regenerateMarkdown();
      this.refresh();
    }
  }

  dispose(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this.stateWatcher?.dispose();
  }
}
