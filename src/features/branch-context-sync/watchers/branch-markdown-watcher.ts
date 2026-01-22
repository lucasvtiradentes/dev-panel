import { ConfigManager } from '../../../common/core/config-manager';
import { createLogger } from '../../../common/lib/logger';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable, Uri } from '../../../common/vscode/vscode-types';
import { attachFileWatcherHandlers } from '../../../common/vscode/vscode-watcher';
import { getSyncCoordinator } from '../coordinator';

const logger = createLogger('BranchMarkdownWatcher');

type BranchMarkdownWatcherInstance = Disposable & {
  updateWatcher: (branchName: string) => void;
};

export function createBranchMarkdownWatcher(): BranchMarkdownWatcherInstance {
  let currentWatcher: Disposable | null = null;
  let currentBranch = '';
  const coordinator = getSyncCoordinator();

  const setupWatcher = (branchName: string) => {
    if (currentWatcher && branchName === currentBranch) {
      return;
    }

    if (currentWatcher) {
      logger.info(`[setupWatcher] Disposing old watcher for branch: "${currentBranch}"`);
      currentWatcher.dispose();
      currentWatcher = null;
    }

    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace || !branchName) {
      currentBranch = branchName;
      return;
    }

    const filePath = ConfigManager.getBranchContextFilePath(workspace, branchName);
    if (!filePath) {
      currentBranch = branchName;
      return;
    }

    const relativePath = filePath.replace(workspace, '').replace(/^\//, '');
    logger.info(`[setupWatcher] Setting up watcher for branch "${branchName}": ${relativePath}`);

    currentBranch = branchName;
    const watcher = VscodeHelper.createFileSystemWatcher(VscodeHelper.createRelativePattern(workspace, relativePath));

    const handleChange = (uri: Uri) => {
      logger.info(`[BranchMarkdownWatcher] File changed: ${uri.fsPath}`);
      coordinator.handleBranchFileChange(uri.fsPath);
    };

    attachFileWatcherHandlers(watcher, {
      onChange: handleChange,
      onCreate: handleChange,
      onDelete: handleChange,
    });

    currentWatcher = watcher;
  };

  setupWatcher('');

  return {
    updateWatcher: (branchName: string) => {
      setupWatcher(branchName);
    },
    dispose: () => {
      if (currentWatcher) {
        currentWatcher.dispose();
      }
    },
  };
}
