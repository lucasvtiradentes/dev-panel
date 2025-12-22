import * as vscode from 'vscode';
import { CONFIG_FILE_NAME } from '../common/constants';
import { getConfigDirPattern } from '../common/lib/config-manager';
import { StoreKey, extensionStore } from '../common/lib/extension-store';

type RefreshCallback = () => void;

export function createConfigWatcher(onConfigChange: RefreshCallback): vscode.FileSystemWatcher {
  const configDirPattern = getConfigDirPattern();
  const configWatcher = vscode.workspace.createFileSystemWatcher(`**/${configDirPattern}/${CONFIG_FILE_NAME}`);

  const handleConfigChange = (_uri: vscode.Uri) => {
    onConfigChange();
  };

  configWatcher.onDidChange(handleConfigChange);
  configWatcher.onDidCreate(handleConfigChange);
  configWatcher.onDidDelete(handleConfigChange);

  extensionStore.subscribe(StoreKey.ConfigDir, () => {
    onConfigChange();
  });

  return configWatcher;
}
