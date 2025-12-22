import * as vscode from 'vscode';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME } from '../common/constants';

type RefreshCallback = () => void;

export function createConfigWatcher(onConfigChange: RefreshCallback): vscode.FileSystemWatcher {
  const configWatcher = vscode.workspace.createFileSystemWatcher(`**/${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME}`);

  const handleConfigChange = (_uri: vscode.Uri) => {
    onConfigChange();
  };

  configWatcher.onDidChange(handleConfigChange);
  configWatcher.onDidCreate(handleConfigChange);
  configWatcher.onDidDelete(handleConfigChange);

  return configWatcher;
}
