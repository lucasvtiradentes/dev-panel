import type * as vscode from 'vscode';
import { getFirstWorkspacePath } from '../common/utils/workspace-utils';

export const WATCHER_CONSTANTS = {
  BRANCH_POLL_INTERVAL_MS: 2000,
  KEYBINDING_UPDATE_DEBOUNCE_MS: 100,
} as const;

export const GIT_CONSTANTS = {
  EXTENSION_ID: 'vscode.git',
  API_VERSION: 1,
  HEAD_FILE_PATH: '.git/HEAD',
} as const;

type FileWatcherHandlers = {
  onChange?: (uri: vscode.Uri) => void;
  onCreate?: (uri: vscode.Uri) => void;
  onDelete?: (uri: vscode.Uri) => void;
};

export function attachFileWatcherHandlers(watcher: vscode.FileSystemWatcher, handlers: FileWatcherHandlers): void {
  if (handlers.onChange) {
    watcher.onDidChange(handlers.onChange);
  }
  if (handlers.onCreate) {
    watcher.onDidCreate(handlers.onCreate);
  }
  if (handlers.onDelete) {
    watcher.onDidDelete(handlers.onDelete);
  }
}

export { getFirstWorkspacePath as getWorkspacePath };
