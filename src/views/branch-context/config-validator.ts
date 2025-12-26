import type { BranchContextConfig } from '../../common/schemas/config-schema';
import { loadTemplate, parseTemplate } from '../_branch_context/storage/template-parser';

export type ValidationIssue = {
  type: 'missing-in-template' | 'unknown-in-template' | 'invalid-provider' | 'type-mismatch';
  section: string;
  message: string;
  severity: 'error' | 'warning';
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
        type: 'missing-in-template',
        section: configSection.name,
        message: `Section "${configSection.name}" is defined in config.jsonc but not found in branch-context-template.md`,
        severity: 'error',
      });
      continue;
    }

    const isAutoCompatible =
      configSection.type === 'auto' && (templateSection.type === 'code' || templateSection.type === 'text');
    const isExactMatch = configSection.type === templateSection.type;
    const isCodeToAuto = templateSection.type === 'code' && configSection.type === 'auto';

    if (!isAutoCompatible && !isExactMatch && !isCodeToAuto) {
      const templateType = templateSection.type === 'code' ? 'auto' : templateSection.type;
      issues.push({
        type: 'type-mismatch',
        section: configSection.name,
        message: `Section "${configSection.name}" type mismatch: config says "${configSection.type}" but template format suggests "${templateType}"`,
        severity: 'warning',
      });
    }

    if (configSection.type === 'auto' && !configSection.provider) {
      issues.push({
        type: 'invalid-provider',
        section: configSection.name,
        message: `Auto section "${configSection.name}" requires a provider path`,
        severity: 'error',
      });
    }
  }

  return issues;
}
