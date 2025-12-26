import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  BRANCH_CONTEXT_TEMPLATE_FILENAME,
  INIT_RESOURCES_DIR_NAME,
  RESOURCES_DIR_NAME,
} from '../../../common/constants/scripts-constants';

const templatePath = path.join(
  __dirname,
  '..',
  '..',
  RESOURCES_DIR_NAME,
  INIT_RESOURCES_DIR_NAME,
  BRANCH_CONTEXT_TEMPLATE_FILENAME,
);
export const DEFAULT_TEMPLATE = fs.readFileSync(templatePath, 'utf-8');
