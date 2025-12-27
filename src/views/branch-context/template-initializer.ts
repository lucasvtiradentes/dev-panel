import * as fs from 'node:fs';
import { ConfigManager } from '../../common/lib/config-manager';
import { extensionStore } from '../../common/lib/extension-store';
import { createLogger } from '../../common/lib/logger';
import { getDefaultTemplate } from '../_branch_base/storage/default-template';

const logger = createLogger('TemplateInitializer');

export function ensureTemplateExists(workspace: string) {
  const templatePath = ConfigManager.getBranchContextTemplatePath(workspace);

  if (fs.existsSync(templatePath)) {
    logger.info(`[ensureTemplateExists] Template already exists at ${templatePath}`);
    return;
  }

  const configDir = ConfigManager.getConfigDirPathFromWorkspacePath(workspace);

  if (!fs.existsSync(configDir)) {
    logger.info(`[ensureTemplateExists] Creating config directory: ${configDir}`);
    fs.mkdirSync(configDir, { recursive: true });
  }

  logger.info(`[ensureTemplateExists] Creating default template at ${templatePath}`);
  const extensionPath = extensionStore.getExtensionPath();
  const defaultTemplate = getDefaultTemplate(extensionPath);
  fs.writeFileSync(templatePath, defaultTemplate, 'utf-8');
}
