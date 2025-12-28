import { TypeGuardsHelper } from '../helpers/type-guards-helper';

export function replaceTemplatePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

export function replaceVariablePlaceholders(content: string, variables: Record<string, unknown>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const stringValue = TypeGuardsHelper.isObject(value) ? JSON.stringify(value) : String(value);
    const pattern = new RegExp(`\\$${key}`, 'g');
    result = result.replace(pattern, stringValue);
  }
  return result;
}
