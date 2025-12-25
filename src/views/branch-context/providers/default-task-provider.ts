import * as fs from 'node:fs';
import {
  MARKDOWN_SECTION_HEADER_PATTERN,
  TASK_ITEM_PATTERN,
  TASK_STATUS_MARKERS,
  TODO_SECTION_HEADER_PATTERN,
} from '../../../common/constants';
import type { NewTask, SyncContext, SyncResult, TaskMeta, TaskNode, TaskStatus, TaskSyncProvider } from './interfaces';
import {
  createEmptyMeta,
  cycleStatus as cycleStatusUtil,
  formatTaskLine,
  parseStatusMarker,
  parseTaskText,
  statusToMarker,
} from './task-utils';

export class DefaultTaskProvider implements TaskSyncProvider {
  fromMarkdown(content: string): TaskNode[] {
    const lines = content.split('\n');
    const rootNodes: TaskNode[] = [];
    const stack: { node: TaskNode; indent: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const match = line.match(TASK_ITEM_PATTERN);
      if (!match) continue;

      const indent = Math.floor(match[1].length / 2);
      const status = parseStatusMarker(match[2]);
      const rawText = match[3];
      const { text, meta } = parseTaskText(rawText);

      const node: TaskNode = {
        text,
        status,
        lineIndex: i,
        children: [],
        meta,
      };

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        rootNodes.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }

      stack.push({ node, indent });
    }

    return rootNodes;
  }

  toMarkdown(tasks: TaskNode[]): string {
    const lines: string[] = [];

    const renderNode = (node: TaskNode, indent = 0): void => {
      const prefix = '  '.repeat(indent);
      const marker = statusToMarker(node.status);
      const taskContent = formatTaskLine(node.text, node.meta);
      lines.push(`${prefix}- [${marker}] ${taskContent}`);
      for (const child of node.children) {
        renderNode(child, indent + 1);
      }
    };

    for (const task of tasks) {
      renderNode(task);
    }
    return lines.join('\n');
  }

  async getTasks(context: SyncContext): Promise<TaskNode[]> {
    if (!fs.existsSync(context.markdownPath)) {
      return [];
    }

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');
    const taskIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));

    if (taskIndex === -1) {
      return [];
    }

    const nextSectionIndex = lines.findIndex((l, i) => i > taskIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l));
    const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
    const taskContent = lines
      .slice(taskIndex + 1, endIndex)
      .join('\n')
      .trim();

    return this.fromMarkdown(taskContent);
  }

  async onStatusChange(lineIndex: number, newStatus: TaskStatus, context: SyncContext): Promise<void> {
    if (!fs.existsSync(context.markdownPath)) return;

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoSectionIndex === -1) return;

    const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
    if (actualLineIndex >= lines.length) return;

    const line = lines[actualLineIndex];
    const match = line.match(TASK_ITEM_PATTERN);
    if (!match) return;

    const newMarker = statusToMarker(newStatus);
    lines[actualLineIndex] = line.replace(/\[([ xX>!])\]/, `[${newMarker}]`);

    this.autoToggleParentTask(lines, actualLineIndex);

    fs.writeFileSync(context.markdownPath, lines.join('\n'));
  }

  async onCreateTask(task: NewTask, parentIndex: number | undefined, context: SyncContext): Promise<TaskNode> {
    if (!fs.existsSync(context.markdownPath)) {
      return { text: task.text, status: 'todo', lineIndex: -1, children: [], meta: createEmptyMeta() };
    }

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoSectionIndex === -1) {
      return { text: task.text, status: 'todo', lineIndex: -1, children: [], meta: createEmptyMeta() };
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
      const nextSectionIndex = lines.findIndex(
        (l, i) => i > todoSectionIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l),
      );
      insertIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
    }

    const newLine = `${indent}- [ ] ${task.text}`;
    lines.splice(insertIndex, 0, newLine);

    fs.writeFileSync(context.markdownPath, lines.join('\n'));

    return {
      text: task.text,
      status: 'todo',
      lineIndex: insertIndex - todoSectionIndex - 2,
      children: [],
      meta: {},
    };
  }

  async onUpdateMeta(lineIndex: number, metaUpdate: Partial<TaskMeta>, context: SyncContext): Promise<void> {
    if (!fs.existsSync(context.markdownPath)) return;

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoSectionIndex === -1) return;

    const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
    if (actualLineIndex >= lines.length) return;

    const line = lines[actualLineIndex];
    const match = line.match(TASK_ITEM_PATTERN);
    if (!match) return;

    const indent = match[1];
    const statusChar = match[2];
    const rawText = match[3];

    const { text, meta: existingMeta } = parseTaskText(rawText);
    const newMeta = { ...existingMeta, ...metaUpdate };
    const newContent = formatTaskLine(text, newMeta);

    lines[actualLineIndex] = `${indent}- [${statusChar}] ${newContent}`;

    fs.writeFileSync(context.markdownPath, lines.join('\n'));
  }

  async onDeleteTask(lineIndex: number, context: SyncContext): Promise<void> {
    if (!fs.existsSync(context.markdownPath)) return;

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoSectionIndex === -1) return;

    const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
    if (actualLineIndex >= lines.length) return;

    const taskLine = lines[actualLineIndex];
    const taskMatch = taskLine.match(TASK_ITEM_PATTERN);
    if (!taskMatch) return;

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

    fs.writeFileSync(context.markdownPath, lines.join('\n'));
  }

  async onSync(_context: SyncContext): Promise<SyncResult> {
    return { added: 0, updated: 0, deleted: 0 };
  }

  cycleStatus(currentStatus: TaskStatus): TaskStatus {
    return cycleStatusUtil(currentStatus);
  }

  private autoToggleParentTask(lines: string[], childLineIndex: number): void {
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
}
