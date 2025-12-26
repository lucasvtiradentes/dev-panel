import { getBranchContextGlobPattern } from '../common/lib/config-manager';
import { createLogger } from '../common/lib/logger';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable, Uri } from '../common/vscode/vscode-types';
import { type UriChangeCallback, attachFileWatcherHandlers } from './utils';

const logger = createLogger('BranchMarkdownWatcher');

export function createBranchMarkdownWatcher(onChange: UriChangeCallback): Disposable {
  const globPattern = getBranchContextGlobPattern();
  logger.info(`Setting up branch markdown watcher with pattern: ${globPattern}`);

  const watcher = VscodeHelper.createFileSystemWatcher(globPattern);

  attachFileWatcherHandlers(watcher, {
    onChange: (uri: Uri) => onChange(uri),
    onCreate: (uri: Uri) => onChange(uri),
    onDelete: (uri: Uri) => {
      logger.info(`Branch markdown file deleted: ${uri.fsPath}`);
      onChange(uri);
    },
  });

  return watcher;
}
