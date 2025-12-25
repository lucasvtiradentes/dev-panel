import * as fs from 'node:fs';
import {
  MARKDOWN_SECTION_HEADER_PATTERN,
  MILESTONE_HEADER_PATTERN,
  TASK_ITEM_PATTERN,
  TASK_STATUS_MARKERS,
  TODO_SECTION_HEADER_PATTERN,
} from '../../../common/constants';
import type {
  MilestoneNode,
  NewTask,
  SyncContext,
  SyncResult,
  TaskMeta,
  TaskNode,
  TaskStatus,
  TaskSyncProvider,
} from './interfaces';
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

  async getMilestones(context: SyncContext): Promise<{ orphanTasks: TaskNode[]; milestones: MilestoneNode[] }> {
    if (!fs.existsSync(context.markdownPath)) {
      return { orphanTasks: [], milestones: [] };
    }

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');
    const taskSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));

    if (taskSectionIndex === -1) {
      return { orphanTasks: [], milestones: [] };
    }

    const nextSectionIndex = lines.findIndex((l, i) => i > taskSectionIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l));
    const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;

    const orphanTasks: TaskNode[] = [];
    const milestones: MilestoneNode[] = [];
    let currentMilestone: MilestoneNode | null = null;
    let currentTaskContent: string[] = [];
    let lineIndexBase = -1;

    const flushTasks = () => {
      if (currentTaskContent.length === 0) return;

      const tasks = this.fromMarkdownWithOffset(currentTaskContent.join('\n'), lineIndexBase);

      if (currentMilestone) {
        currentMilestone.tasks.push(...tasks);
      } else {
        orphanTasks.push(...tasks);
      }
      currentTaskContent = [];
    };

    for (let i = taskSectionIndex + 1; i < endIndex; i++) {
      const line = lines[i];
      const milestoneMatch = line.match(MILESTONE_HEADER_PATTERN);

      if (milestoneMatch) {
        flushTasks();
        currentMilestone = {
          name: milestoneMatch[1].trim(),
          lineIndex: i - taskSectionIndex - 1,
          tasks: [],
        };
        milestones.push(currentMilestone);
        lineIndexBase = i - taskSectionIndex - 1;
      } else {
        currentTaskContent.push(line);
      }
    }

    flushTasks();

    return { orphanTasks, milestones };
  }

  async moveTaskToMilestone(
    taskLineIndex: number,
    targetMilestoneName: string | null,
    context: SyncContext,
  ): Promise<void> {
    if (!fs.existsSync(context.markdownPath)) return;

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoSectionIndex === -1) return;

    const nextSectionIndex = lines.findIndex((l, i) => i > todoSectionIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l));
    const sectionEndIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;

    const actualLineIndex = todoSectionIndex + 1 + taskLineIndex + 1;
    if (actualLineIndex >= lines.length) return;

    const taskLine = lines[actualLineIndex];
    const taskMatch = taskLine.match(TASK_ITEM_PATTERN);
    if (!taskMatch) return;

    const taskIndent = Math.floor(taskMatch[1].length / 2);
    let taskEndIndex = actualLineIndex + 1;
    for (let i = actualLineIndex + 1; i < sectionEndIndex; i++) {
      const match = lines[i].match(TASK_ITEM_PATTERN);
      if (!match) {
        if (lines[i].trim() === '' || MILESTONE_HEADER_PATTERN.test(lines[i])) break;
        continue;
      }
      const lineIndent = Math.floor(match[1].length / 2);
      if (lineIndent <= taskIndent) break;
      taskEndIndex = i + 1;
    }

    const taskLines = lines.slice(actualLineIndex, taskEndIndex);
    lines.splice(actualLineIndex, taskEndIndex - actualLineIndex);

    let insertIndex: number;

    if (targetMilestoneName === null) {
      let firstMilestoneIndex = -1;
      for (let i = todoSectionIndex + 1; i < sectionEndIndex; i++) {
        if (MILESTONE_HEADER_PATTERN.test(lines[i])) {
          firstMilestoneIndex = i;
          break;
        }
      }

      if (firstMilestoneIndex === -1) {
        let lastTaskIndex = todoSectionIndex;
        for (let i = todoSectionIndex + 1; i < sectionEndIndex; i++) {
          if (TASK_ITEM_PATTERN.test(lines[i])) {
            lastTaskIndex = i;
          }
        }
        insertIndex = lastTaskIndex + 1;
      } else {
        let insertBeforeMilestone = todoSectionIndex + 1;
        for (let i = todoSectionIndex + 1; i < firstMilestoneIndex; i++) {
          if (TASK_ITEM_PATTERN.test(lines[i])) {
            insertBeforeMilestone = i + 1;
          }
        }
        insertIndex = insertBeforeMilestone;
      }
    } else {
      let targetMilestoneIndex = -1;
      let nextMilestoneIndex = sectionEndIndex;

      for (let i = todoSectionIndex + 1; i < sectionEndIndex; i++) {
        const match = lines[i].match(MILESTONE_HEADER_PATTERN);
        if (match && match[1].trim() === targetMilestoneName) {
          targetMilestoneIndex = i;
        } else if (match && targetMilestoneIndex !== -1) {
          nextMilestoneIndex = i;
          break;
        }
      }

      if (targetMilestoneIndex === -1) return;

      let lastTaskInMilestone = targetMilestoneIndex;
      for (let i = targetMilestoneIndex + 1; i < nextMilestoneIndex; i++) {
        if (TASK_ITEM_PATTERN.test(lines[i])) {
          lastTaskInMilestone = i;
        }
      }

      insertIndex = lastTaskInMilestone + 1;
    }

    lines.splice(insertIndex, 0, ...taskLines);

    fs.writeFileSync(context.markdownPath, lines.join('\n'));
  }

  async createMilestone(name: string, context: SyncContext): Promise<void> {
    if (!fs.existsSync(context.markdownPath)) return;

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoSectionIndex === -1) return;

    const nextSectionIndex = lines.findIndex((l, i) => i > todoSectionIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l));
    const sectionEndIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;

    let insertIndex = sectionEndIndex;
    for (let i = sectionEndIndex - 1; i > todoSectionIndex; i--) {
      if (lines[i].trim() !== '') {
        insertIndex = i + 1;
        break;
      }
    }

    const newMilestoneLines = ['', `## ${name}`, ''];
    lines.splice(insertIndex, 0, ...newMilestoneLines);

    fs.writeFileSync(context.markdownPath, lines.join('\n'));
  }

  async reorderTask(
    taskLineIndex: number,
    targetLineIndex: number,
    position: 'before' | 'after',
    context: SyncContext,
  ): Promise<void> {
    if (!fs.existsSync(context.markdownPath)) return;
    if (taskLineIndex === targetLineIndex) return;

    const content = fs.readFileSync(context.markdownPath, 'utf-8');
    const lines = content.split('\n');

    const todoSectionIndex = lines.findIndex((l) => TODO_SECTION_HEADER_PATTERN.test(l));
    if (todoSectionIndex === -1) return;

    const nextSectionIndex = lines.findIndex((l, i) => i > todoSectionIndex && MARKDOWN_SECTION_HEADER_PATTERN.test(l));
    const sectionEndIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;

    const actualTaskIndex = todoSectionIndex + 1 + taskLineIndex + 1;
    const actualTargetIndex = todoSectionIndex + 1 + targetLineIndex + 1;

    if (actualTaskIndex >= sectionEndIndex || actualTargetIndex >= sectionEndIndex) return;

    const taskLine = lines[actualTaskIndex];
    const taskMatch = taskLine.match(TASK_ITEM_PATTERN);
    if (!taskMatch) return;

    const taskIndent = Math.floor(taskMatch[1].length / 2);
    let taskEndIndex = actualTaskIndex + 1;
    for (let i = actualTaskIndex + 1; i < sectionEndIndex; i++) {
      const match = lines[i].match(TASK_ITEM_PATTERN);
      if (!match) {
        if (lines[i].trim() === '' || MILESTONE_HEADER_PATTERN.test(lines[i])) break;
        continue;
      }
      const lineIndent = Math.floor(match[1].length / 2);
      if (lineIndent <= taskIndent) break;
      taskEndIndex = i + 1;
    }

    const taskLines = lines.splice(actualTaskIndex, taskEndIndex - actualTaskIndex);

    let newTargetIndex = actualTargetIndex;
    if (actualTargetIndex > actualTaskIndex) {
      newTargetIndex -= taskLines.length;
    }

    const targetLine = lines[newTargetIndex];
    const targetMatch = targetLine?.match(TASK_ITEM_PATTERN);
    if (!targetMatch) return;

    const targetIndent = Math.floor(targetMatch[1].length / 2);
    let targetEndIndex = newTargetIndex + 1;
    for (let i = newTargetIndex + 1; i < lines.length; i++) {
      const match = lines[i].match(TASK_ITEM_PATTERN);
      if (!match) {
        if (lines[i].trim() === '' || MILESTONE_HEADER_PATTERN.test(lines[i])) break;
        continue;
      }
      const lineIndent = Math.floor(match[1].length / 2);
      if (lineIndent <= targetIndent) break;
      targetEndIndex = i + 1;
    }

    const indentDiff = targetIndent - taskIndent;
    const adjustedTaskLines = taskLines.map((line) => {
      const match = line.match(TASK_ITEM_PATTERN);
      if (!match) return line;

      const currentIndentSpaces = match[1].length;
      const newIndentSpaces = Math.max(0, currentIndentSpaces + indentDiff * 2);
      const newIndent = '  '.repeat(newIndentSpaces / 2);
      return line.replace(/^(\s*)/, newIndent);
    });

    const insertIndex = position === 'before' ? newTargetIndex : targetEndIndex;
    lines.splice(insertIndex, 0, ...adjustedTaskLines);

    fs.writeFileSync(context.markdownPath, lines.join('\n'));
  }

  private fromMarkdownWithOffset(content: string, lineIndexBase: number): TaskNode[] {
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
        lineIndex: lineIndexBase + i,
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

  async onEditText(lineIndex: number, newText: string, context: SyncContext): Promise<void> {
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

    const { meta: existingMeta } = parseTaskText(rawText);
    const newContent = formatTaskLine(newText, existingMeta);

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
