import {
  BRANCH_CONTEXT_NA,
  BRANCH_CONTEXT_NO_CHANGES,
  CODEBLOCK_CONTENT_PATTERN,
  MARKDOWN_SECTION_HEADER_PATTERN,
  createFieldStartPattern,
  createFieldValuePattern,
  createSectionHeaderPattern,
} from '../../constants';
import { BranchContextMarkdownHelper } from '../../core/branch-context-markdown';
import { FileIOHelper } from './node-helper';
import { TypeGuardsHelper } from './type-guards-helper';

export class MarkdownHelper {
  static extractField(content: string, fieldName: string): string | undefined {
    const match = content.match(createFieldValuePattern(fieldName));
    if (!match) return undefined;

    const value = match[1].trim();
    if (BranchContextMarkdownHelper.isFieldEmpty(value)) return undefined;
    return value;
  }

  static extractSection(content: string, sectionName: string): string | undefined {
    const headerMatch = content.match(createSectionHeaderPattern(sectionName));
    if (!headerMatch || headerMatch.index === undefined) return undefined;

    const startIndex = headerMatch.index + headerMatch[0].length;
    const afterHeader = content.slice(startIndex);
    const nextHeaderMatch = afterHeader.match(MARKDOWN_SECTION_HEADER_PATTERN);
    const endIndex = nextHeaderMatch?.index ?? afterHeader.length;
    const sectionContent = afterHeader.slice(0, endIndex).trim();

    if (BranchContextMarkdownHelper.isFieldEmpty(sectionContent)) return undefined;
    return sectionContent;
  }

  static extractCodeBlockSection(content: string, sectionName: string): string | undefined {
    const headerMatch = content.match(createSectionHeaderPattern(sectionName));
    if (!headerMatch || headerMatch.index === undefined) return undefined;

    const startIndex = headerMatch.index + headerMatch[0].length;
    const afterHeader = content.slice(startIndex);

    const codeBlockMatch = afterHeader.match(CODEBLOCK_CONTENT_PATTERN);
    if (!codeBlockMatch) return undefined;

    const codeContent = codeBlockMatch[1].trim();
    if (BranchContextMarkdownHelper.isFieldEmpty(codeContent, BRANCH_CONTEXT_NO_CHANGES)) return undefined;
    return codeContent;
  }

  static getFieldLineNumber(filePath: string, fieldName: string): number {
    if (!FileIOHelper.fileExists(filePath)) return 0;

    const content = FileIOHelper.readFile(filePath);
    return MarkdownHelper.getFieldLineNumberFromContent(content, fieldName);
  }

  static getFieldLineNumberFromContent(content: string, fieldName: string): number {
    const lines = content.split('\n');
    const sectionPattern = createSectionHeaderPattern(fieldName);
    const fieldPattern = createFieldStartPattern(fieldName);

    for (let i = 0; i < lines.length; i++) {
      if (sectionPattern.test(lines[i])) {
        return i + 2;
      }
      if (fieldPattern.test(lines[i])) {
        return i;
      }
    }

    return 0;
  }

  static isSectionEmpty(value: string | undefined, customNaValue?: string): boolean {
    if (!value) return true;
    const trimmed = value.trim();
    if (TypeGuardsHelper.isEmpty(trimmed) || trimmed === BRANCH_CONTEXT_NA) return true;
    if (customNaValue !== undefined && trimmed === customNaValue) return true;
    return false;
  }
}
