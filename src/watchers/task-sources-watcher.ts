import { createLogger } from '../common/lib/logger';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, Uri } from '../common/vscode/vscode-types';
import { type RefreshCallback, attachFileWatcherHandlers } from '../common/vscode/vscode-watcher';

const logger = createLogger('TaskSrcW');

const TASK_SOURCE_PATTERNS = ['**/.vscode/tasks.json', '**/package.json', '**/Makefile', '**/makefile'];

export function createTaskSourcesWatcher(onTaskSourceChange: RefreshCallback): Disposable {
  const watchers = TASK_SOURCE_PATTERNS.map((pattern) => {
    const watcher = VscodeHelper.createFileSystemWatcher(pattern);

    const handler = (uri: Uri) => {
      logger.info(`[taskSourcesWatcher] File changed: ${uri.fsPath}`);
      onTaskSourceChange();
    };

    attachFileWatcherHandlers(watcher, {
      onChange: handler,
      onCreate: handler,
      onDelete: handler,
    });

    return watcher;
  });

  logger.info('[createTaskSourcesWatcher] Watchers created OK');

  return {
    dispose: () => {
      logger.info('[createTaskSourcesWatcher] Disposing');
      for (const watcher of watchers) {
        watcher.dispose();
      }
    },
  };
}
