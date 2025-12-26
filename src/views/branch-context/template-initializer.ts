import * as fs from 'node:fs';
import { getBranchContextTemplatePath, getConfigDirPathFromWorkspacePath } from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import { DEFAULT_TEMPLATE } from '../_branch_context/storage/default-template';

const logger = createLogger('TemplateInitializer');

export function ensureTemplateExists(workspace: string) {
  const templatePath = getBranchContextTemplatePath(workspace);

  if (fs.existsSync(templatePath)) {
    logger.info(`[ensureTemplateExists] Template already exists at ${templatePath}`);
    return;
  }

  const configDir = getConfigDirPathFromWorkspacePath(workspace);

  if (!fs.existsSync(configDir)) {
    logger.info(`[ensureTemplateExists] Creating config directory: ${configDir}`);
    fs.mkdirSync(configDir, { recursive: true });
  }

  logger.info(`[ensureTemplateExists] Creating default template at ${templatePath}`);
  fs.writeFileSync(templatePath, DEFAULT_TEMPLATE, 'utf-8');
}
