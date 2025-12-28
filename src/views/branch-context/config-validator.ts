import { BRANCH_CONTEXT_TEMPLATE_FILENAME, CONFIG_FILE_NAME } from 'src/common/constants';
import type { BranchContextConfig } from '../../common/schemas/config-schema';
import { SectionType } from '../../common/schemas/types';
import { TemplateSectionType, loadTemplate, parseTemplate } from '../_branch_base/storage/template-parser';

enum ValidationIssueType {
  MissingInTemplate = 'missing-in-template',
  UnknownInTemplate = 'unknown-in-template',
  InvalidProvider = 'invalid-provider',
  TypeMismatch = 'type-mismatch',
}

export enum ValidationSeverity {
  Error = 'error',
  Warning = 'warning',
}

export type ValidationIssue = {
  type: ValidationIssueType;
  section: string;
  message: string;
  severity: ValidationSeverity;
};

export function validateBranchContext(workspace: string, config: BranchContextConfig | undefined): ValidationIssue[] {
  if (!config || !config.customSections || config.customSections.length === 0) {
    return [];
  }

  const issues: ValidationIssue[] = [];
  const template = loadTemplate(workspace);
  const templateSections = parseTemplate(template);

  for (const configSection of config.customSections) {
    const templateSection = templateSections.find((t) => t.name === configSection.name);

    if (!templateSection) {
      issues.push({
        type: ValidationIssueType.MissingInTemplate,
        section: configSection.name,
        message: `Section "${configSection.name}" is defined in ${CONFIG_FILE_NAME} but not found in ${BRANCH_CONTEXT_TEMPLATE_FILENAME}`,
        severity: ValidationSeverity.Error,
      });
      continue;
    }

    const isAutoCompatible =
      configSection.type === SectionType.Auto &&
      (templateSection.type === TemplateSectionType.Code || templateSection.type === TemplateSectionType.Text);
    const isExactMatch = configSection.type === templateSection.type;
    const isCodeToAuto = templateSection.type === TemplateSectionType.Code && configSection.type === SectionType.Auto;

    if (!isAutoCompatible && !isExactMatch && !isCodeToAuto) {
      const templateType = templateSection.type === TemplateSectionType.Code ? SectionType.Auto : templateSection.type;
      issues.push({
        type: ValidationIssueType.TypeMismatch,
        section: configSection.name,
        message: `Section "${configSection.name}" type mismatch: config says "${configSection.type}" but template format suggests "${templateType}"`,
        severity: ValidationSeverity.Warning,
      });
    }

    if (configSection.type === SectionType.Auto && !configSection.provider) {
      issues.push({
        type: ValidationIssueType.InvalidProvider,
        section: configSection.name,
        message: `Auto section "${configSection.name}" requires a provider path`,
        severity: ValidationSeverity.Error,
      });
    }
  }

  return issues;
}
