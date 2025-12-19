import * as vscode from 'vscode';

type RefreshCallback = () => void;

export function createConfigWatcher(onConfigChange: RefreshCallback): vscode.FileSystemWatcher {
  const configWatcher = vscode.workspace.createFileSystemWatcher('**/.bpm/config.jsonc');

  const handleConfigChange = (_uri: vscode.Uri) => {
    onConfigChange();
  };

  configWatcher.onDidChange(handleConfigChange);
  configWatcher.onDidCreate(handleConfigChange);
  configWatcher.onDidDelete(handleConfigChange);

  return configWatcher;
}
