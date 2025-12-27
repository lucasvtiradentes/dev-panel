import {
  DEFAULT_TASK_STATUS,
  INVALID_LINE_INDEX,
  MARKDOWN_SECTION_HEADER_PATTERN,
  TASK_ITEM_PATTERN,
  TASK_STATUS_MARKERS,
  TODO_SECTION_HEADER_PATTERN,
} from '../../../common/constants';
import type { TaskStatus } from '../../../common/schemas';
import { FileIOHelper } from '../../../common/utils/file-io';
import type { NewTask, SyncContext, TaskMeta, TaskNode } from '../providers/interfaces';
import { formatTaskLine, parseTaskText, statusToMarker } from './task-utils';

function createEmptyTaskNode(text: string): TaskNode {
  return {
    text,
    status: DEFAULT_TASK_STATUS,
    lineIndex: INVALID_LINE_INDEX,
    children: [],
    meta: {},
  };
}

export function onStatusChange(lineIndex: number, newStatus: TaskStatus, context: SyncContext) {
  if (!FileIOHelper.fileExists(context.markdownPath)) return Promise.resolve();

  const content = FileIOHelper.readFile(context.markdownPath);
  const lines = content.split('\n');

  const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
  if (todoSectionIndex === -1) return Promise.resolve();

  const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
  if (actualLineIndex >= lines.length) return Promise.resolve();

  const line = lines[actualLineIndex];
  const match = line.match(TASK_ITEM_PATTERN);
  if (!match) return Promise.resolve();

  const newMarker = statusToMarker(newStatus);
  lines[actualLineIndex] = line.replace(/\[([ xX>!])\]/, `[${newMarker}]`);

  autoToggleParentTask(lines, actualLineIndex);

  FileIOHelper.writeFile(context.markdownPath, lines.join('\n'));
  return Promise.resolve();
}

export function onCreateTask(task: NewTask, parentIndex: number | undefined, context: SyncContext): Promise<TaskNode> {
  if (!FileIOHelper.fileExists(context.markdownPath)) {
    return Promise.resolve(createEmptyTaskNode(task.text));
  }

  const content = FileIOHelper.readFile(context.markdownPath);
  const lines = content.split('\n');

  const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
  if (todoSectionIndex === -1) {
    return Promise.resolve(createEmptyTaskNode(task.text));
  }

  let insertIndex: number;
  let indent = '';

  if (parentIndex !== undefined) {
    const actualParentIndex = todoSectionIndex + 1 + parentIndex + 1;
    const parentLine = lines[actualParentIndex];
    const parentMatch = parentLine?.match(TASK_ITEM_PATTERN);
    if (parentMatch) {
      indent = `${parentMatch[1]}  `;
    }

    let lastChildIndex = actualParentIndex;
    const parentIndentLevel = Math.floor(indent.length / 2) - 1;

    for (let i = actualParentIndex + 1; i < lines.length; i++) {
      const match = lines[i].match(TASK_ITEM_PATTERN);
      if (!match) continue;

      const lineIndent = Math.floor(match[1].length / 2);
      if (lineIndent <= parentIndentLevel) break;
      lastChildIndex = i;
    }

    insertIndex = lastChildIndex + 1;
  } else {
    const nextSectionIndex = lines.findIndex((l, i) => i > todoSectionIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l));
    const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;

    let lastTaskIndex = todoSectionIndex;
    for (let i = todoSectionIndex + 1; i < endIndex; i++) {
      if (TASK_ITEM_PATTERN.test(lines[i])) {
        lastTaskIndex = i;
      }
    }

    insertIndex = lastTaskIndex + 1;
  }

  const newLine = `${indent}- [ ] ${task.text}`;
  lines.splice(insertIndex, 0, newLine);

  FileIOHelper.writeFile(context.markdownPath, lines.join('\n'));

  const taskNode = createEmptyTaskNode(task.text);
  taskNode.lineIndex = insertIndex - todoSectionIndex - 2;
  return Promise.resolve(taskNode);
}

export function onUpdateMeta(lineIndex: number, metaUpdate: Partial<TaskMeta>, context: SyncContext) {
  if (!FileIOHelper.fileExists(context.markdownPath)) return Promise.resolve();

  const content = FileIOHelper.readFile(context.markdownPath);
  const lines = content.split('\n');

  const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
  if (todoSectionIndex === -1) return Promise.resolve();

  const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
  if (actualLineIndex >= lines.length) return Promise.resolve();

  const line = lines[actualLineIndex];
  const match = line.match(TASK_ITEM_PATTERN);
  if (!match) return Promise.resolve();

  const indent = match[1];
  const statusChar = match[2];
  const rawText = match[3];

  const { text, meta: existingMeta } = parseTaskText(rawText);
  const newMeta = { ...existingMeta, ...metaUpdate };
  const newContent = formatTaskLine(text, newMeta);

  lines[actualLineIndex] = `${indent}- [${statusChar}] ${newContent}`;

  FileIOHelper.writeFile(context.markdownPath, lines.join('\n'));
  return Promise.resolve();
}

export function onEditText(lineIndex: number, newText: string, context: SyncContext) {
  if (!FileIOHelper.fileExists(context.markdownPath)) return Promise.resolve();

  const content = FileIOHelper.readFile(context.markdownPath);
  const lines = content.split('\n');

  const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
  if (todoSectionIndex === -1) return Promise.resolve();

  const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
  if (actualLineIndex >= lines.length) return Promise.resolve();

  const line = lines[actualLineIndex];
  const match = line.match(TASK_ITEM_PATTERN);
  if (!match) return Promise.resolve();

  const indent = match[1];
  const statusChar = match[2];
  const rawText = match[3];

  const { meta: existingMeta } = parseTaskText(rawText);
  const newContent = formatTaskLine(newText, existingMeta);

  lines[actualLineIndex] = `${indent}- [${statusChar}] ${newContent}`;

  FileIOHelper.writeFile(context.markdownPath, lines.join('\n'));
  return Promise.resolve();
}

export function onDeleteTask(lineIndex: number, context: SyncContext) {
  if (!FileIOHelper.fileExists(context.markdownPath)) return Promise.resolve();

  const content = FileIOHelper.readFile(context.markdownPath);
  const lines = content.split('\n');

  const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
  if (todoSectionIndex === -1) return Promise.resolve();

  const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
  if (actualLineIndex >= lines.length) return Promise.resolve();

  const taskLine = lines[actualLineIndex];
  const taskMatch = taskLine.match(TASK_ITEM_PATTERN);
  if (!taskMatch) return Promise.resolve();

  const taskIndent = Math.floor(taskMatch[1].length / 2);

  let endIndex = actualLineIndex + 1;
  for (let i = actualLineIndex + 1; i < lines.length; i++) {
    const match = lines[i].match(TASK_ITEM_PATTERN);
    if (!match) continue;

    const lineIndent = Math.floor(match[1].length / 2);
    if (lineIndent <= taskIndent) break;
    endIndex = i + 1;
  }

  lines.splice(actualLineIndex, endIndex - actualLineIndex);

  FileIOHelper.writeFile(context.markdownPath, lines.join('\n'));
  return Promise.resolve();
}

function autoToggleParentTask(lines: string[], childLineIndex: number) {
  const childMatch = lines[childLineIndex].match(TASK_ITEM_PATTERN);
  if (!childMatch) return;

  const childIndent = Math.floor(childMatch[1].length / 2);
  if (childIndent === 0) return;

  let parentLineIndex = -1;
  for (let i = childLineIndex - 1; i >= 0; i--) {
    const match = lines[i].match(TASK_ITEM_PATTERN);
    if (!match) continue;

    const indent = Math.floor(match[1].length / 2);
    if (indent < childIndent) {
      parentLineIndex = i;
      break;
    }
  }

  if (parentLineIndex === -1) return;

  const parentMatch = lines[parentLineIndex].match(TASK_ITEM_PATTERN);
  if (!parentMatch) return;

  const parentIndent = Math.floor(parentMatch[1].length / 2);

  const children: number[] = [];
  for (let i = parentLineIndex + 1; i < lines.length; i++) {
    const match = lines[i].match(TASK_ITEM_PATTERN);
    if (!match) continue;

    const indent = Math.floor(match[1].length / 2);

    if (indent <= parentIndent) break;

    if (indent === parentIndent + 1) {
      children.push(i);
    }
  }

  if (children.length === 0) return;

  const allChildrenDone = children.every((idx) => {
    const line = lines[idx];
    return line.includes(TASK_STATUS_MARKERS.DONE_LOWER) || line.includes(TASK_STATUS_MARKERS.DONE_UPPER);
  });

  const parentLine = lines[parentLineIndex];
  if (allChildrenDone) {
    if (parentLine.includes(TASK_STATUS_MARKERS.TODO)) {
      lines[parentLineIndex] = parentLine.replace(TASK_STATUS_MARKERS.TODO, TASK_STATUS_MARKERS.DONE_LOWER);
    }
  } else {
    if (parentLine.includes(TASK_STATUS_MARKERS.DONE_LOWER) || parentLine.includes(TASK_STATUS_MARKERS.DONE_UPPER)) {
      lines[parentLineIndex] = parentLine.replace(/\[[xX]\]/, TASK_STATUS_MARKERS.TODO);
    }
  }
}
