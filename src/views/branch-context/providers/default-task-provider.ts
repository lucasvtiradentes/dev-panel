import * as fs from 'node:fs';
import {
  MARKDOWN_SECTION_HEADER_PATTERN,
  TASK_ITEM_PATTERN,
  TASK_STATUS_MARKERS,
  TODO_SECTION_HEADER_PATTERN,
} from '../../../common/constants';
import type { NewTask, SyncContext, SyncResult, TaskMeta, TaskNode, TaskStatus, TaskSyncProvider } from './interfaces';
import { createEmptyMeta, cycleStatus as cycleStatusUtil, parseStatusMarker, statusToMarker } from './task-utils';

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
      const text = match[3].trim();

      const node: TaskNode = {
        text,
        status,
        lineIndex: i,
        children: [],
        meta: createEmptyMeta(),
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
      lines.push(`${prefix}- [${marker}] ${node.text}`);
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

  async onCreateTask(_task: NewTask, _parentIndex: number | undefined, _context: SyncContext): Promise<TaskNode> {
    return {
      text: _task.text,
      status: 'todo',
      lineIndex: -1,
      children: [],
      meta: createEmptyMeta(),
    };
  }

  async onUpdateMeta(_lineIndex: number, _meta: Partial<TaskMeta>, _context: SyncContext): Promise<void> {
    // To be implemented in Stage 2
  }

  async onDeleteTask(_lineIndex: number, _context: SyncContext): Promise<void> {
    // To be implemented when needed
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
