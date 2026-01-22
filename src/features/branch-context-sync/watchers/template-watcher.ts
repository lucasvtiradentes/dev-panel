import { ConfigManager } from '../../../common/core/config-manager';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { createSimpleFileWatcher } from '../../../common/vscode/vscode-watcher';
import { getSyncCoordinator } from '../coordinator';

export function createTemplateWatcher(): Disposable {
  const coordinator = getSyncCoordinator();

  return createSimpleFileWatcher({
    getRelativePath: (workspace) => {
      const templatePath = ConfigManager.getBranchContextTemplatePath(workspace);
      return templatePath.replace(workspace, '').replace(/^\//, '');
    },
    onChange: () => coordinator.handleTemplateChange(),
    loggerName: 'TemplateWatcher',
  });
}
