import {
  MARKDOWN_SECTION_HEADER_PATTERN,
  TASK_ITEM_PATTERN,
  TODO_SECTION_HEADER_PATTERN,
} from '../../../common/constants';

export class TaskLineUtils {
  static findTodoSectionIndex(lines: string[]): number {
    return lines.findIndex((l: string) => TODO_SECTION_HEADER_PATTERN.test(l));
  }

  static findNextSectionIndex(lines: string[], startIndex: number): number {
    const nextIndex = lines.findIndex(
      (l: string, i: number) => i > startIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l),
    );
    return nextIndex === -1 ? lines.length : nextIndex;
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
