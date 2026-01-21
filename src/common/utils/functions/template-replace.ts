import { createTemplatePlaceholderPattern, createVariablePlaceholderPattern } from '../../constants';
import { TypeGuardsHelper } from '../helpers/type-guards-helper';

export function replaceTemplatePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(createTemplatePlaceholderPattern(placeholder), value);
  }
  return result;
}

export function replaceVariablePlaceholders(content: string, variables: Record<string, unknown>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const stringValue = TypeGuardsHelper.isObject(value) ? JSON.stringify(value) : String(value);
    result = result.replace(createVariablePlaceholderPattern(key), stringValue);
  }
  return result;
}
