import { CONFIG_FILE_NAME, VARIABLES_FILE_NAME } from '../common/constants';
import { StoreKey, extensionStore } from '../common/core/extension-store';
import { createLogger } from '../common/lib/logger';
import { ConfigManager } from '../common/utils/config-manager';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, Uri } from '../common/vscode/vscode-types';
import { type RefreshCallback, attachFileWatcherHandlers } from './utils';

const logger = createLogger('ConfigWatcher');

export function createConfigWatcher(onConfigChange: RefreshCallback): Disposable {
  const configDirPattern = ConfigManager.getConfigDirPattern();
  const pattern = `**/${configDirPattern}/{${CONFIG_FILE_NAME},${VARIABLES_FILE_NAME}}`;
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

  const storeUnsubscribe = extensionStore.subscribe(StoreKey.ConfigDir, () => {
    logger.info('[configWatcher] ConfigDir store changed');
    onConfigChange();
  });

  logger.info('[createConfigWatcher] Watcher created OK');

  return {
    dispose: () => {
      logger.info('[createConfigWatcher] Disposing');
      configWatcher.dispose();
      storeUnsubscribe();
    },
  };
}
