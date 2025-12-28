import { BRANCH_CONTEXT_NA, CONFIG_FILE_NAME, METADATA_FIELD_IS_EMPTY } from '../constants';
import { FileIOHelper } from '../utils/helpers/node-helper';
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

export class BranchContextMarkdownHelper {
  static isFieldEmpty(value: string | undefined, customNaValue?: string): boolean {
    if (!value) return true;
    const trimmed = value.trim();
    return (
      trimmed === '' || trimmed === BRANCH_CONTEXT_NA || (customNaValue !== undefined && trimmed === customNaValue)
    );
  }

  static isFieldValid(value: string | undefined, customNaValue?: string): boolean {
    return !BranchContextMarkdownHelper.isFieldEmpty(value, customNaValue);
  }

  static isSectionEmpty(value: string | undefined, sectionType: string, metadata?: Record<string, unknown>): boolean {
    if (sectionType === 'auto') {
      if (metadata && metadata[METADATA_FIELD_IS_EMPTY] === true) return true;
      return false;
    }

    if (!value) return true;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === BRANCH_CONTEXT_NA) return true;
    return false;
  }

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
