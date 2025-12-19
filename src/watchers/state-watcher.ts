import * as vscode from 'vscode';

type RefreshCallback = () => void;

export function createStateWatcher(onStateChange: RefreshCallback): vscode.FileSystemWatcher {
  const stateWatcher = vscode.workspace.createFileSystemWatcher('**/.bpm/state.json');

  const handleStateChange = (_uri: vscode.Uri) => {
    onStateChange();
  };

  stateWatcher.onDidChange(handleStateChange);
  stateWatcher.onDidCreate(handleStateChange);
  stateWatcher.onDidDelete(handleStateChange);

  return stateWatcher;
}
