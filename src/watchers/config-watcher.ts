import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, VARIABLES_FILE_NAME } from '../common/constants';
import { createLogger } from '../common/lib/logger';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, Uri } from '../common/vscode/vscode-types';
import { type RefreshCallback, attachFileWatcherHandlers } from '../common/vscode/vscode-watcher';

const logger = createLogger('ConfigWatcher');

export function createConfigWatcher(onConfigChange: RefreshCallback): Disposable {
  const pattern = `**/${CONFIG_DIR_NAME}/{${CONFIG_FILE_NAME},${VARIABLES_FILE_NAME}}`;
  logger.info(`[createConfigWatcher] Pattern: ${pattern}`);

  const configWatcher = VscodeHelper.createFileSystemWatcher(pattern);

  const handleConfigChange = (uri: Uri) => {
    logger.info(`[configWatcher] File changed: ${uri.fsPath}`);
    onConfigChange();
  };

  attachFileWatcherHandlers(configWatcher, {
    onChange: handleConfigChange,
    onCreate: handleConfigChange,
    onDelete: handleConfigChange,
  });

  logger.info('[createConfigWatcher] Watcher created OK');

  return {
    dispose: () => {
      logger.info('[createConfigWatcher] Disposing');
      configWatcher.dispose();
    },
  };
}
