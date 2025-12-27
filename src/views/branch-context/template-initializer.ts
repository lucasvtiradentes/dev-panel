import { ConfigManager } from '../../common/lib/config-manager';
import { extensionStore } from '../../common/lib/extension-store';
import { createLogger } from '../../common/lib/logger';
import { FileIOHelper } from '../../common/lib/node-helper';
import { getDefaultTemplate } from '../_branch_base/storage/default-template';

const logger = createLogger('TemplateInitializer');

export function ensureTemplateExists(workspace: string) {
  const templatePath = ConfigManager.getBranchContextTemplatePath(workspace);

  if (FileIOHelper.fileExists(templatePath)) {
    logger.info(`[ensureTemplateExists] Template already exists at ${templatePath}`);
    return;
  }

  const configDir = ConfigManager.getConfigDirPathFromWorkspacePath(workspace);

  if (!FileIOHelper.fileExists(configDir)) {
    logger.info(`[ensureTemplateExists] Creating config directory: ${configDir}`);
    FileIOHelper.ensureDirectoryExists(configDir);
  }

  logger.info(`[ensureTemplateExists] Creating default template at ${templatePath}`);
  const extensionPath = extensionStore.getExtensionPath();
  const defaultTemplate = getDefaultTemplate(extensionPath);
  FileIOHelper.writeFile(templatePath, defaultTemplate);
}
