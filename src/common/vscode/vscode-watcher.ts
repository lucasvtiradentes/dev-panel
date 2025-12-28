import { createLogger } from '../lib/logger';
import { VscodeHelper } from './vscode-helper';
import type { Disposable, FileSystemWatcher, Uri } from './vscode-types';

export type RefreshCallback = () => void;
export type UriChangeCallback = (uri: Uri) => void;

export const WATCHER_CONSTANTS = {
  BRANCH_POLL_INTERVAL_MS: 2000,
  KEYBINDING_UPDATE_DEBOUNCE_MS: 100,
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

type SimpleFileWatcherOptions = {
  getRelativePath: (workspace: string) => string | null;
  onChange: RefreshCallback;
  loggerName: string;
};

export function createSimpleFileWatcher(opts: SimpleFileWatcherOptions): Disposable {
  const { getRelativePath, onChange, loggerName } = opts;
  const logger = createLogger(loggerName);

  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) {
    logger.warn('No workspace found, watcher not created');
    return { dispose: () => undefined };
  }

  const relativePath = getRelativePath(workspace);
  if (!relativePath) {
    logger.warn('No path resolved, watcher not created');
    return { dispose: () => undefined };
  }

  logger.info(`Setting up watcher for: ${relativePath}`);

  const watcher = VscodeHelper.createFileSystemWatcher(VscodeHelper.createRelativePattern(workspace, relativePath));

  attachFileWatcherHandlers(watcher, {
    onChange: () => onChange(),
    onCreate: () => onChange(),
    onDelete: () => {
      logger.info('File deleted');
      onChange();
    },
  });

  return watcher;
}
