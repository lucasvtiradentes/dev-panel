import { ROOT_BRANCH_CONTEXT_FILE_NAME } from '../../../common/constants/scripts-constants';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { createSimpleFileWatcher } from '../../../common/vscode/vscode-watcher';
import { getSyncCoordinator } from '../coordinator';

export function createRootMarkdownWatcher(): Disposable {
  const coordinator = getSyncCoordinator();

  return createSimpleFileWatcher({
    getRelativePath: () => ROOT_BRANCH_CONTEXT_FILE_NAME,
    onChange: () => coordinator.handleRootMarkdownChange(),
    loggerName: 'RootMarkdownWatcher',
  });
}
