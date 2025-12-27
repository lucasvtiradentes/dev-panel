import { CONFIG_FILE_NAME } from '../constants';
import { FileIOHelper } from '../lib/node-helper';
import { ConfigManager } from './config-manager';

type ValidationIssue = {
  section: string;
  message: string;
  severity: string;
};

type ValidationResult =
  | {
      success: true;
      issues: ValidationIssue[];
    }
  | {
      success: false;
      error: 'no-config' | 'parse-error';
    };

export class BranchContextUtils {
  static getValidationIssues<T>(
    workspace: string,
    validateFn: (workspace: string, branchContext: T) => ValidationIssue[],
  ): ValidationResult {
    const configPath = ConfigManager.getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!FileIOHelper.fileExists(configPath)) {
      return { success: false, error: 'no-config' };
    }

    const configContent = FileIOHelper.readFile(configPath);
    const config = ConfigManager.parseConfig(configContent);
    if (!config) {
      return { success: false, error: 'parse-error' };
    }

    const issues = validateFn(workspace, config.branchContext as T);
    return { success: true, issues };
  }
}
