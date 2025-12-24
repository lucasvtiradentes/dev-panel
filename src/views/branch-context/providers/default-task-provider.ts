import * as fs from 'node:fs';
import {
  MARKDOWN_SECTION_HEADER_PATTERN,
  TODO_CHECKBOX_CHECKED_LOWER,
  TODO_CHECKBOX_CHECKED_UPPER,
  TODO_CHECKBOX_UNCHECKED,
  TODO_ITEM_PATTERN,
  TODO_MILESTONE_PATTERN,
  TODO_SECTION_HEADER_PATTERN,
} from '../../../common/constants';
import type { NewTask, SyncContext, TaskNode, TaskSyncProvider } from './interfaces';

export class DefaultTaskProvider implements TaskSyncProvider {
  fromMarkdown(content: string): TaskNode[] {
    const lines = content.split('\n');
    const rootNodes: TaskNode[] = [];
    const stack: { node: TaskNode; indent: number }[] = [];
    let currentMilestone: TaskNode | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const milestoneMatch = line.match(TODO_MILESTONE_PATTERN);
      if (milestoneMatch) {
        const milestoneNode: TaskNode = {
          text: milestoneMatch[1].trim(),
          isChecked: false,
          lineIndex: i,
          children: [],
          isHeading: true,
        };
        rootNodes.push(milestoneNode);
        currentMilestone = milestoneNode;
        stack.length = 0;
        continue;
      }

      const match = line.match(TODO_ITEM_PATTERN);
      if (!match) continue;

      const indent = Math.floor(match[1].length / 2);
      const isChecked = match[2].toLowerCase() === 'x';
      const text = match[3].trim();

      const node: TaskNode = { text, isChecked, lineIndex: i, children: [] };

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        if (currentMilestone) {
          currentMilestone.children.push(node);
        } else {
          rootNodes.push(node);
        }
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

      if (node.isHeading) {
        lines.push(`\n## ${node.text}\n`);
        for (const child of node.children) {
          renderNode(child, 0);
        }
      } else {
        const checkbox = node.isChecked ? '[x]' : '[ ]';
        lines.push(`${prefix}- ${checkbox} ${node.text}`);
        for (const child of node.children) {
          renderNode(child, indent + 1);
        }
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

  async onToggleTask(lineIndex: number, context: SyncContext): Promise<void> {
    if (!fs.existsSync(context.markdownPath)) return;

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoSectionIndex === -1) return;

    const actualLineIndex = todoSectionIndex + 1 + lineIndex + 1;
    if (actualLineIndex >= lines.length) return;

    const line = lines[actualLineIndex];
    if (line.includes(TODO_CHECKBOX_UNCHECKED)) {
      lines[actualLineIndex] = line.replace(TODO_CHECKBOX_UNCHECKED, TODO_CHECKBOX_CHECKED_LOWER);
    } else if (line.includes(TODO_CHECKBOX_CHECKED_LOWER) || line.includes(TODO_CHECKBOX_CHECKED_UPPER)) {
      lines[actualLineIndex] = line.replace(/\[[xX]\]/, TODO_CHECKBOX_UNCHECKED);
    }

    this.autoToggleParentTask(lines, actualLineIndex);

    fs.writeFileSync(context.markdownPath, lines.join('\n'));
  }

  async onCreateTask(_task: NewTask, _context: SyncContext): Promise<void> {
    // To be implemented when needed
  }

  async onSync(_context: SyncContext): Promise<void> {
    // Default provider syncs from markdown (no external source)
  }

  private autoToggleParentTask(lines: string[], childLineIndex: number): void {
    const childMatch = lines[childLineIndex].match(TODO_ITEM_PATTERN);
    if (!childMatch) return;

    const childIndent = Math.floor(childMatch[1].length / 2);
    if (childIndent === 0) return;

    let parentLineIndex = -1;
    for (let i = childLineIndex - 1; i >= 0; i--) {
      const match = lines[i].match(TODO_ITEM_PATTERN);
      if (!match) continue;

      const indent = Math.floor(match[1].length / 2);
      if (indent < childIndent) {
        parentLineIndex = i;
        break;
      }
    }

    if (parentLineIndex === -1) return;

    const parentMatch = lines[parentLineIndex].match(TODO_ITEM_PATTERN);
    if (!parentMatch) return;

    const parentIndent = Math.floor(parentMatch[1].length / 2);

    const children: number[] = [];
    for (let i = parentLineIndex + 1; i < lines.length; i++) {
      const match = lines[i].match(TODO_ITEM_PATTERN);
      if (!match) continue;

      const indent = Math.floor(match[1].length / 2);

      if (indent <= parentIndent) break;

      if (indent === parentIndent + 1) {
        children.push(i);
      }
    }

    if (children.length === 0) return;

    const allChildrenChecked = children.every((idx) => {
      const line = lines[idx];
      return line.includes(TODO_CHECKBOX_CHECKED_LOWER) || line.includes(TODO_CHECKBOX_CHECKED_UPPER);
    });

    const parentLine = lines[parentLineIndex];
    if (allChildrenChecked) {
      if (parentLine.includes(TODO_CHECKBOX_UNCHECKED)) {
        lines[parentLineIndex] = parentLine.replace(TODO_CHECKBOX_UNCHECKED, TODO_CHECKBOX_CHECKED_LOWER);
      }
    } else {
      if (parentLine.includes(TODO_CHECKBOX_CHECKED_LOWER) || parentLine.includes(TODO_CHECKBOX_CHECKED_UPPER)) {
        lines[parentLineIndex] = parentLine.replace(/\[[xX]\]/, TODO_CHECKBOX_UNCHECKED);
      }
    }
  }
}
