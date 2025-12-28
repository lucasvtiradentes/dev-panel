import { Git, type GitRepository } from '../common/lib/git';
import { createLogger } from '../common/lib/logger';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, FileSystemWatcher } from '../common/vscode/vscode-types';
import { WATCHER_CONSTANTS } from './utils';

type BranchChangeCallback = (newBranch: string) => void;

const logger = createLogger('BranchWatcher');

export function createBranchWatcher(onBranchChange: BranchChangeCallback): Disposable {
  const disposables: Disposable[] = [];
  let currentBranch = '';
  let headWatcher: FileSystemWatcher | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const handleBranchChange = async () => {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    try {
      const newBranch = await Git.getCurrentBranch(workspace);
      if (newBranch !== currentBranch) {
        logger.info(`[branchWatcher] Branch changed from '${currentBranch}' to '${newBranch}'`);
        currentBranch = newBranch;
        onBranchChange(newBranch);
      }
    } catch (error) {
      logger.error(`Failed to get current branch: ${String(error)}`);
    }
  };

  const setupGitWatcher = async () => {
    const gitAPI = await Git.getAPI();
    if (!gitAPI) return;

    for (const repo of gitAPI.repositories) {
      attachRepoListeners(repo);
    }

    disposables.push(
      gitAPI.onDidOpenRepository((newRepo) => {
        attachRepoListeners(newRepo);
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
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    headWatcher = VscodeHelper.createFileSystemWatcher(
      VscodeHelper.createRelativePattern(workspace, Git.INTEGRATION.HEAD_FILE_PATH),
    );

    headWatcher.onDidChange(() => void handleBranchChange());
    disposables.push(headWatcher);
  };

  const setupPolling = () => {
    pollInterval = setInterval(() => {
      void handleBranchChange();
    }, WATCHER_CONSTANTS.BRANCH_POLL_INTERVAL_MS);
  };

  const initializeBranch = async () => {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return;

    if (await Git.isRepository(workspace)) {
      currentBranch = await Git.getCurrentBranch(workspace);
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
