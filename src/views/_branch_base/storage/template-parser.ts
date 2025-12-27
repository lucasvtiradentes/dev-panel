import * as fs from 'node:fs';
import { ConfigManager } from '../../../common/lib/config-manager';
import { extensionStore } from '../../../common/lib/extension-store';
import { getDefaultTemplate } from './default-template';

export enum TemplateSectionType {
  Field = 'field',
  Text = 'text',
  Code = 'code',
}

export type TemplateSection = {
  name: string;
  type: TemplateSectionType;
  placeholder: string;
  order: number;
};

export function loadTemplate(workspace: string): string {
  const templatePath = ConfigManager.getBranchContextTemplatePath(workspace);

  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf-8');
  }

  const extensionPath = extensionStore.getExtensionPath();
  return getDefaultTemplate(extensionPath);
}

export function parseTemplate(templateContent: string): TemplateSection[] {
  const sections: TemplateSection[] = [];
  const lines = templateContent.split('\n');
  let order = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const fieldMatch = line.match(/^([A-Z\s]+):\s*\{\{([A-Z_]+)\}\}\s*$/);
    if (fieldMatch) {
      sections.push({
        name: fieldMatch[1].trim(),
        type: TemplateSectionType.Field,
        placeholder: fieldMatch[2],
        order: order++,
      });
      continue;
    }

    const headingMatch = line.match(/^#\s+([A-Z\s]+)\s*$/);
    if (headingMatch) {
      const sectionName = headingMatch[1].trim();

      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;

      if (j < lines.length && lines[j].trim().startsWith('```')) {
        const placeholderMatch = lines[j + 1]?.match(/\{\{([A-Z_]+)\}\}/);
        sections.push({
          name: sectionName,
          type: TemplateSectionType.Code,
          placeholder: placeholderMatch?.[1] || sectionName.replace(/\s+/g, '_').toUpperCase(),
          order: order++,
        });
      } else {
        const placeholderMatch = lines[j]?.match(/\{\{([A-Z_]+)\}\}/);
        sections.push({
          name: sectionName,
          type: TemplateSectionType.Text,
          placeholder: placeholderMatch?.[1] || sectionName.replace(/\s+/g, '_').toUpperCase(),
          order: order++,
        });
      }
    }
  }

  return sections;
}
