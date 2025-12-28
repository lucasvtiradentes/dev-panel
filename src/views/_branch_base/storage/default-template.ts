import {
  BRANCH_CONTEXT_TEMPLATE_FILENAME,
  INIT_RESOURCES_DIR_NAME,
  RESOURCES_DIR_NAME,
} from '../../../common/constants/scripts-constants';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';

export function getDefaultTemplate(extensionPath: string): string {
  const templatePath = NodePathHelper.join(
    extensionPath,
    RESOURCES_DIR_NAME,
    INIT_RESOURCES_DIR_NAME,
    BRANCH_CONTEXT_TEMPLATE_FILENAME,
  );
  return FileIOHelper.readFile(templatePath);
}
