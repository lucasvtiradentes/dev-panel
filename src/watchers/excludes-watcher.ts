import { createLogger } from '../common/lib/logger';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, Uri } from '../common/vscode/vscode-types';
import { type RefreshCallback, attachFileWatcherHandlers } from '../common/vscode/vscode-watcher';

const logger = createLogger('ExcludesWatcher');

export function createExcludesWatcher(onExcludeChange: RefreshCallback): Disposable {
  const pattern = '**/.git/info/exclude';
  logger.info(`[createExcludesWatcher] Pattern: ${pattern}`);

  const excludesWatcher = VscodeHelper.createFileSystemWatcher(pattern);

  const handleExcludeChange = (uri: Uri) => {
    logger.info(`[createExcludesWatcher] File changed: ${uri.fsPath}`);
    onExcludeChange();
  };

  attachFileWatcherHandlers(excludesWatcher, {
    onChange: handleExcludeChange,
    onCreate: handleExcludeChange,
    onDelete: handleExcludeChange,
  });

  logger.info('[createExcludesWatcher] Watcher created OK');

  return {
    dispose: () => {
      logger.info('[createExcludesWatcher] Disposing');
      excludesWatcher.dispose();
    },
  };
}
