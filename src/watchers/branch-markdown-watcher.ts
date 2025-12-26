import * as vscode from 'vscode';
import { getBranchContextFilePath } from '../common/lib/config-manager';
import { createLogger } from '../common/lib/logger';
import { getFirstWorkspacePath } from '../common/utils/workspace-utils';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, Uri } from '../common/vscode/vscode-types';
import { type UriChangeCallback, attachFileWatcherHandlers } from './utils';

const logger = createLogger('BranchMarkdownWatcher');

type DynamicWatcherCallbacks = {
  onChange: UriChangeCallback;
  getCurrentBranch: () => string;
};

export function createBranchMarkdownWatcher(callbacks: DynamicWatcherCallbacks): Disposable {
  let currentWatcher: Disposable | null = null;
  let currentBranch = '';

  const setupWatcher = (branchName: string) => {
    if (currentWatcher) {
      logger.info(`[setupWatcher] Disposing old watcher for branch: ${currentBranch}`);
      currentWatcher.dispose();
    }

    const workspace = getFirstWorkspacePath();
    if (!workspace || !branchName) {
      logger.warn('[setupWatcher] No workspace or branch, skipping watcher setup');
      return;
    }

    const filePath = getBranchContextFilePath(workspace, branchName);
    if (!filePath) {
      logger.warn(`[setupWatcher] No file path for branch: ${branchName}`);
      return;
    }

    const relativePath = filePath.replace(workspace, '').replace(/^\//, '');
    logger.info(`[setupWatcher] Setting up watcher for branch "${branchName}": ${relativePath}`);

    currentBranch = branchName;
    const watcher = VscodeHelper.createFileSystemWatcher(new vscode.RelativePattern(workspace, relativePath));

    attachFileWatcherHandlers(watcher, {
      onChange: (uri: Uri) => callbacks.onChange(uri),
      onCreate: (uri: Uri) => callbacks.onChange(uri),
      onDelete: (uri: Uri) => {
        logger.info(`Branch markdown file deleted: ${uri.fsPath}`);
        callbacks.onChange(uri);
      },
    });

    currentWatcher = watcher;
  };

  const checkAndUpdateWatcher = () => {
    const newBranch = callbacks.getCurrentBranch();
    if (newBranch !== currentBranch) {
      setupWatcher(newBranch);
    }
  };

  setupWatcher(callbacks.getCurrentBranch());

  const pollInterval = setInterval(checkAndUpdateWatcher, 2000);

  return {
    dispose: () => {
      logger.info('[dispose] Cleaning up branch markdown watcher');
      clearInterval(pollInterval);
      if (currentWatcher) {
        currentWatcher.dispose();
      }
    },
  };
}
