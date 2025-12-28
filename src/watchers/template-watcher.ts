import { ConfigManager } from '../common/core/config-manager';
import type { Disposable } from '../common/vscode/vscode-types';
import { type RefreshCallback, createSimpleFileWatcher } from '../common/vscode/vscode-watcher';

export function createTemplateWatcher(onChange: RefreshCallback): Disposable {
  return createSimpleFileWatcher({
    getRelativePath: (workspace) => {
      const templatePath = ConfigManager.getBranchContextTemplatePath(workspace);
      return templatePath.replace(workspace, '').replace(/^\//, '');
    },
    onChange,
    loggerName: 'TemplateWatcher',
  });
}
