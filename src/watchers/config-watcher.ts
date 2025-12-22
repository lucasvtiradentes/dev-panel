import * as vscode from 'vscode';
import { CONFIG_FILE_NAME } from '../common/constants';
import { getConfigDirPattern } from '../common/lib/config-manager';
import { StoreKey, extensionStore } from '../common/lib/extension-store';
import type { RefreshCallback } from './types';
import { attachFileWatcherHandlers } from './utils';

export function createConfigWatcher(onConfigChange: RefreshCallback): vscode.Disposable {
  const configDirPattern = getConfigDirPattern();
  const configWatcher = vscode.workspace.createFileSystemWatcher(`**/${configDirPattern}/${CONFIG_FILE_NAME}`);

  const handleConfigChange = (_uri: vscode.Uri) => {
    onConfigChange();
  };

  attachFileWatcherHandlers(configWatcher, {
    onChange: handleConfigChange,
    onCreate: handleConfigChange,
    onDelete: handleConfigChange,
  });

  const storeUnsubscribe = extensionStore.subscribe(StoreKey.ConfigDir, () => {
    onConfigChange();
  });

  return {
    dispose: () => {
      configWatcher.dispose();
      storeUnsubscribe();
    },
  };
}
