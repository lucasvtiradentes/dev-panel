import type { FileSystemWatcher, Uri } from '../common/vscode/vscode-types';

export type RefreshCallback = () => void;
export type UriChangeCallback = (uri: Uri) => void;

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
  onChange?: (uri: Uri) => void;
  onCreate?: (uri: Uri) => void;
  onDelete?: (uri: Uri) => void;
};

export function attachFileWatcherHandlers(watcher: FileSystemWatcher, handlers: FileWatcherHandlers) {
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
