import { createLogger } from '../common/lib/logger';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, Uri } from '../common/vscode/vscode-types';
import { type RefreshCallback, attachFileWatcherHandlers } from '../common/vscode/vscode-watcher';

const logger = createLogger('ExcludesWatcher');

export function createGitExcludesWatcher(onExcludeChange: RefreshCallback): Disposable {
  const pattern = '**/.git/info/exclude';
  logger.info(`[createGitExcludesWatcher] Pattern: ${pattern}`);

  const excludesWatcher = VscodeHelper.createFileSystemWatcher(pattern);

  const handleExcludeChange = (uri: Uri) => {
    logger.info(`[createGitExcludesWatcher] File changed: ${uri.fsPath}`);
    onExcludeChange();
  };

  attachFileWatcherHandlers(excludesWatcher, {
    onChange: handleExcludeChange,
    onCreate: handleExcludeChange,
    onDelete: handleExcludeChange,
  });

  logger.info('[createGitExcludesWatcher] Watcher created OK');

  return {
    dispose: () => {
      logger.info('[createGitExcludesWatcher] Disposing');
      excludesWatcher.dispose();
    },
  };
}
