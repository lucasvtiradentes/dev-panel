import * as vscode from 'vscode';
import { getCurrentBranch, isGitRepository } from '../views/replacements/git-utils';

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

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

type BranchChangeCallback = (newBranch: string) => void;

export function createBranchWatcher(onBranchChange: BranchChangeCallback): vscode.Disposable {
  const disposables: vscode.Disposable[] = [];
  let currentBranch = '';
  let headWatcher: vscode.FileSystemWatcher | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const handleBranchChange = async () => {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    try {
      const newBranch = await getCurrentBranch(workspace);
      if (newBranch !== currentBranch) {
        currentBranch = newBranch;
        onBranchChange(newBranch);
      }
    } catch {
      // Ignore
    }
  };

  const setupGitWatcher = async () => {
    const gitAPI = await getGitAPI();
    if (!gitAPI) return;

    for (const repo of gitAPI.repositories) {
      attachRepoListeners(repo);
    }

    disposables.push(
      gitAPI.onDidOpenRepository((repo) => {
        attachRepoListeners(repo);
      }),
    );
  };

  const attachRepoListeners = (repo: GitRepository) => {
    disposables.push(repo.onDidCheckout(() => void handleBranchChange()));

    const branchName = repo.state.HEAD?.name;
    if (branchName && !currentBranch) {
      currentBranch = branchName;
      void onBranchChange(branchName);
    }
  };

  const setupHeadFileWatcher = () => {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    headWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, '.git/HEAD'));

    headWatcher.onDidChange(() => void handleBranchChange());
    disposables.push(headWatcher);
  };

  const setupPolling = () => {
    pollInterval = setInterval(() => {
      void handleBranchChange();
    }, 2000);
  };

  const initializeBranch = async () => {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    if (await isGitRepository(workspace)) {
      currentBranch = await getCurrentBranch(workspace);
      onBranchChange(currentBranch);
    }
  };

  void setupGitWatcher();
  setupHeadFileWatcher();
  setupPolling();
  void initializeBranch();

  return {
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
      headWatcher?.dispose();
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    },
  };
}
