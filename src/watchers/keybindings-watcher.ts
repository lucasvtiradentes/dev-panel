import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getVSCodeKeybindingsPath } from '../lib/vscode-keybindings-utils';

export function createKeybindingsWatcher(onKeybindingsChange: () => void): vscode.Disposable {
  const keybindingsPath = getVSCodeKeybindingsPath();

  if (!fs.existsSync(keybindingsPath)) {
    return { dispose: () => {} };
  }

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(path.dirname(keybindingsPath), 'keybindings.json'),
  );

  watcher.onDidChange(() => onKeybindingsChange());
  watcher.onDidCreate(() => onKeybindingsChange());
  watcher.onDidDelete(() => onKeybindingsChange());

  return watcher;
}
