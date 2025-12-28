import { ConfigManager } from '../common/core/config-manager';
import { createLogger } from '../common/lib/logger';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, Uri } from '../common/vscode/vscode-types';
import { type UriChangeCallback, attachFileWatcherHandlers } from './utils';

const logger = createLogger('BranchMarkdownWatcher');

type DynamicWatcherCallbacks = {
  onChange: UriChangeCallback;
};

type BranchMarkdownWatcherInstance = Disposable & {
  updateWatcher: (branchName: string) => void;
};

export function createBranchMarkdownWatcher(callbacks: DynamicWatcherCallbacks): BranchMarkdownWatcherInstance {
  let currentWatcher: Disposable | null = null;
  let currentBranch = '';

  const setupWatcher = (branchName: string) => {
    logger.info(
      `[BranchMarkdownWatcher] [setupWatcher] Called with branch: "${branchName}" (current: "${currentBranch}")`,
    );

    if (currentWatcher && branchName === currentBranch) {
      logger.info('[BranchMarkdownWatcher] [setupWatcher] Branch unchanged, keeping existing watcher');
      return;
    }

    if (currentWatcher) {
      logger.info(`[BranchMarkdownWatcher] [setupWatcher] Disposing old watcher for branch: "${currentBranch}"`);
      currentWatcher.dispose();
      currentWatcher = null;
    }

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace || !branchName) {
      logger.warn('[BranchMarkdownWatcher] [setupWatcher] No workspace or branch, skipping watcher setup');
      currentBranch = branchName;
      return;
    }

    const filePath = ConfigManager.getBranchContextFilePath(workspace, branchName);
    if (!filePath) {
      logger.warn(`[BranchMarkdownWatcher] [setupWatcher] No file path for branch: "${branchName}"`);
      currentBranch = branchName;
      return;
    }

    const relativePath = filePath.replace(workspace, '').replace(/^\//, '');
    logger.info(
      `[BranchMarkdownWatcher] [setupWatcher] Setting up watcher for branch "${branchName}": ${relativePath}`,
    );

    currentBranch = branchName;
    const watcher = VscodeHelper.createFileSystemWatcher(VscodeHelper.createRelativePattern(workspace, relativePath));

    attachFileWatcherHandlers(watcher, {
      onChange: (uri: Uri) => {
        logger.info(`[BranchMarkdownWatcher] File changed: ${uri.fsPath}`);
        callbacks.onChange(uri);
      },
      onCreate: (uri: Uri) => {
        logger.info(`[BranchMarkdownWatcher] File created: ${uri.fsPath}`);
        callbacks.onChange(uri);
      },
      onDelete: (uri: Uri) => {
        logger.info(`[BranchMarkdownWatcher] File deleted: ${uri.fsPath}`);
        callbacks.onChange(uri);
      },
    });

    currentWatcher = watcher;
    logger.info(`[BranchMarkdownWatcher] [setupWatcher] Watcher setup complete for branch: "${branchName}"`);
  };

  const initialBranch = '';
  logger.info(`[BranchMarkdownWatcher] [createBranchMarkdownWatcher] Initial setup with branch: "${initialBranch}"`);
  setupWatcher(initialBranch);

  return {
    updateWatcher: (branchName: string) => {
      logger.info(`[BranchMarkdownWatcher] [updateWatcher] External update request for branch: "${branchName}"`);
      setupWatcher(branchName);
    },
    dispose: () => {
      logger.info('[BranchMarkdownWatcher] [dispose] Cleaning up branch markdown watcher');
      if (currentWatcher) {
        currentWatcher.dispose();
      }
    },
  };
}
