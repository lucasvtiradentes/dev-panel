import * as vscode from 'vscode';
import { ROOT_BRANCH_CONTEXT_FILE_NAME } from '../common/constants/scripts-constants';
import { createLogger } from '../common/lib/logger';
import { getFirstWorkspacePath } from '../common/utils/workspace-utils';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable } from '../common/vscode/vscode-types';
import type { RefreshCallback } from './utils';
import { attachFileWatcherHandlers } from './utils';

const logger = createLogger('RootMarkdownWatcher');

export function createRootMarkdownWatcher(onChange: RefreshCallback): Disposable {
  logger.info(`Setting up root markdown watcher for: ${ROOT_BRANCH_CONTEXT_FILE_NAME}`);

  const workspace = getFirstWorkspacePath();
  if (!workspace) {
    logger.warn('No workspace found, watcher not created');
    return { dispose: () => undefined };
  }

  const watcher = VscodeHelper.createFileSystemWatcher(
    new vscode.RelativePattern(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME),
  );

  attachFileWatcherHandlers(watcher, {
    onChange: () => onChange(),
    onCreate: () => onChange(),
  });

  return watcher;
}
