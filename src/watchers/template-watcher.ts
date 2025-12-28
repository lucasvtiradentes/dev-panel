import { ConfigManager } from '../common/core/config-manager';
import { createLogger } from '../common/lib/logger';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import type { Disposable } from '../common/vscode/vscode-types';
import { type RefreshCallback, attachFileWatcherHandlers } from './utils';

const logger = createLogger('TemplateWatcher');

export function createTemplateWatcher(onChange: RefreshCallback): Disposable {
  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) {
    logger.warn('No workspace found, watcher not created');
    return { dispose: () => undefined };
  }

  const templatePath = ConfigManager.getBranchContextTemplatePath(workspace);
  logger.info(`Setting up template watcher for: ${templatePath}`);

  const watcher = VscodeHelper.createFileSystemWatcher(
    VscodeHelper.createRelativePattern(workspace, templatePath.replace(workspace, '').replace(/^\//, '')),
  );

  attachFileWatcherHandlers(watcher, {
    onChange: () => onChange(),
    onCreate: () => onChange(),
    onDelete: () => {
      logger.info('Template file deleted');
      onChange();
    },
  });

  return watcher;
}
