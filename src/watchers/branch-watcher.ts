import * as vscode from 'vscode';
import { createLogger } from '../common/lib/logger';
import { getFirstWorkspacePath } from '../common/utils/workspace-utils';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, Event, FileSystemWatcher } from '../common/vscode/vscode-types';
import { getCurrentBranch, isGitRepository } from '../views/replacements/git-utils';
import { GIT_CONSTANTS, WATCHER_CONSTANTS } from './utils';

type GitAPI = {
  repositories: GitRepository[];
  onDidOpenRepository: Event<GitRepository>;
};

type GitRepository = {
  state: {
    HEAD?: { name?: string };
  };
  onDidCheckout: Event<void>;
};

type BranchChangeCallback = (newBranch: string) => void;

const logger = createLogger('BranchWatcher');

async function getGitAPI(): Promise<GitAPI | null> {
  const gitExtension = vscode.extensions.getExtension(GIT_CONSTANTS.EXTENSION_ID);
  if (!gitExtension) {
    return null;
  }
  if (!gitExtension.isActive) {
    await gitExtension.activate();
  }
  return gitExtension.exports.getAPI(GIT_CONSTANTS.API_VERSION);
}

export function createBranchWatcher(onBranchChange: BranchChangeCallback): Disposable {
  const disposables: Disposable[] = [];
  let currentBranch = '';
  let headWatcher: FileSystemWatcher | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const handleBranchChange = async () => {
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    try {
      const newBranch = await getCurrentBranch(workspace);
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
    const gitAPI = await getGitAPI();
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
    const workspace = getFirstWorkspacePath();
    if (!workspace) return;

    headWatcher = VscodeHelper.createFileSystemWatcher(
      VscodeHelper.createRelativePattern(workspace, GIT_CONSTANTS.HEAD_FILE_PATH),
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
    const workspace = getFirstWorkspacePath();
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
