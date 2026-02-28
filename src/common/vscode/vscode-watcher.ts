import type { FileSystemWatcher, Uri } from './vscode-types';

export type RefreshCallback = () => void;

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
