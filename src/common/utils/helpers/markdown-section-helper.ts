import { MARKDOWN_H1_HEADER_PATTERN, MARKDOWN_SECTION_HEADER_PATTERN } from '../../constants';
import { BranchContextMarkdownHelper } from '../../core/branch-context-markdown';

export type ExtractedSection = {
  startIndex: number;
  endIndex: number;
  content: string;
};

export class MarkdownSectionHelper {
  static findSectionIndex(lines: string[], pattern: RegExp): number {
    return lines.findIndex((l: string) => pattern.test(l));
  }

  static findNextSectionIndex(lines: string[], startIndex: number): number {
    const nextIndex = lines.findIndex(
      (l: string, i: number) => i > startIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l),
    );
    return nextIndex === -1 ? lines.length : nextIndex;
  }

  static extractSectionLines(lines: string[], pattern: RegExp): ExtractedSection | null {
    const startIndex = MarkdownSectionHelper.findSectionIndex(lines, pattern);
    if (startIndex === -1) return null;

    const endIndex = MarkdownSectionHelper.findNextSectionIndex(lines, startIndex);
    const content = lines
      .slice(startIndex + 1, endIndex)
      .join('\n')
      .trim();

    return { startIndex, endIndex, content };
  }

  static extractSection(content: string, sectionName: string): string | undefined {
    const headerRegex = new RegExp(`^#\\s+${sectionName}\\s*$`, 'im');
    const headerMatch = content.match(headerRegex);
    if (!headerMatch || headerMatch.index === undefined) return undefined;

    const startIndex = headerMatch.index + headerMatch[0].length;
    const afterHeader = content.slice(startIndex);
    const nextHeaderMatch = afterHeader.match(MARKDOWN_H1_HEADER_PATTERN);
    const endIndex =
      nextHeaderMatch && nextHeaderMatch.index !== undefined ? nextHeaderMatch.index : afterHeader.length;
    const sectionContent = afterHeader.slice(0, endIndex).trim();

    if (BranchContextMarkdownHelper.isFieldEmpty(sectionContent)) return undefined;
    return sectionContent;
  }
}
