import {
  BRANCH_CONTEXT_TEMPLATE_FILENAME,
  INIT_RESOURCES_DIR_NAME,
  RESOURCES_DIR_NAME,
} from '../../../common/constants/scripts-constants';
import { FileIOHelper } from '../../../common/utils/file-io';
import { PathHelper } from '../../../common/utils/path-helper';

export function getDefaultTemplate(extensionPath: string): string {
  const templatePath = PathHelper.join(
    extensionPath,
    RESOURCES_DIR_NAME,
    INIT_RESOURCES_DIR_NAME,
    BRANCH_CONTEXT_TEMPLATE_FILENAME,
  );
  return FileIOHelper.readFile(templatePath);
}
