import { TASK_ITEM_PATTERN, TODO_SECTION_HEADER_PATTERN } from '../../../common/constants';
import { MarkdownSectionHelper } from '../../../common/utils/helpers/markdown-section-helper';

export class TaskLineUtils {
  static findTodoSectionIndex(lines: string[]): number {
    return MarkdownSectionHelper.findSectionIndex(lines, TODO_SECTION_HEADER_PATTERN);
  }

  static findNextSectionIndex(lines: string[], startIndex: number): number {
    return MarkdownSectionHelper.findNextSectionIndex(lines, startIndex);
  }

  static getIndentLevel(match: RegExpMatchArray): number {
    return Math.floor(match[1].length / 2);
  }

  static getTaskIndentFromLine(line: string): number | null {
    const match = line.match(TASK_ITEM_PATTERN);
    if (!match) return null;
    return TaskLineUtils.getIndentLevel(match);
  }
}
