import { ROOT_BRANCH_CONTEXT_FILE_NAME } from '../common/constants/scripts-constants';
import type { Disposable } from '../common/vscode/vscode-types';
import { type RefreshCallback, createSimpleFileWatcher } from '../common/vscode/vscode-watcher';

export function createRootMarkdownWatcher(onChange: RefreshCallback): Disposable {
  return createSimpleFileWatcher({
    getRelativePath: () => ROOT_BRANCH_CONTEXT_FILE_NAME,
    onChange,
    loggerName: 'RootMarkdownWatcher',
  });
}
