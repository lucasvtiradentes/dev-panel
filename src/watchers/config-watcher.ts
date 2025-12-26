import * as vscode from 'vscode';
import { CONFIG_FILE_NAME, VARIABLES_FILE_NAME } from '../common/constants';
import { getConfigDirPattern } from '../common/lib/config-manager';
import { StoreKey, extensionStore } from '../common/lib/extension-store';
import { createLogger } from '../common/lib/logger';
import type { Disposable, Uri } from '../common/vscode/vscode-types';
import type { RefreshCallback } from './types';
import { attachFileWatcherHandlers } from './utils';

const logger = createLogger('ConfigWatcher');

export function createConfigWatcher(onConfigChange: RefreshCallback): Disposable {
  const configDirPattern = getConfigDirPattern();
  const pattern = `**/${configDirPattern}/{${CONFIG_FILE_NAME},${VARIABLES_FILE_NAME}}`;
  logger.info(`[createConfigWatcher] Pattern: ${pattern}`);

  const configWatcher = vscode.workspace.createFileSystemWatcher(pattern);

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
