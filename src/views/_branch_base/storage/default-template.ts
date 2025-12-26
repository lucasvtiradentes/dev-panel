import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  BRANCH_CONTEXT_TEMPLATE_FILENAME,
  INIT_RESOURCES_DIR_NAME,
  RESOURCES_DIR_NAME,
} from '../../../common/constants/scripts-constants';

export function getDefaultTemplate(extensionPath: string): string {
  const templatePath = path.join(
    extensionPath,
    RESOURCES_DIR_NAME,
    INIT_RESOURCES_DIR_NAME,
    BRANCH_CONTEXT_TEMPLATE_FILENAME,
  );
  return fs.readFileSync(templatePath, 'utf-8');
}
