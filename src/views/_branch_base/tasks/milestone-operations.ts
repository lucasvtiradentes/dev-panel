import { MILESTONE_HEADER_PATTERN, TASK_ITEM_PATTERN } from '../../../common/constants';
import { Position } from '../../../common/constants/enums';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../../../common/utils/helpers/type-guards-helper';
import type { MilestoneNode, SyncContext, TaskNode } from '../providers/interfaces';
import { TaskLineUtils } from './task-line-utils';
import { fromMarkdownWithOffset } from './task-markdown';

export function getMilestones(context: SyncContext): Promise<{ orphanTasks: TaskNode[]; milestones: MilestoneNode[] }> {
  if (!FileIOHelper.fileExists(context.markdownPath)) {
    return Promise.resolve({ orphanTasks: [], milestones: [] });
  }

  const content = FileIOHelper.readFile(context.markdownPath);
  const lines = content.split('\n');
  const taskSectionIndex = TaskLineUtils.findTodoSectionIndex(lines);

  if (taskSectionIndex === -1) {
    return Promise.resolve({ orphanTasks: [], milestones: [] });
  }

  const endIndex = TaskLineUtils.findNextSectionIndex(lines, taskSectionIndex);

  const orphanTasks: TaskNode[] = [];
  const milestones: MilestoneNode[] = [];
  let currentMilestone: MilestoneNode | null = null;
  let currentTaskContent: string[] = [];
  let lineIndexBase = -1;

  const flushTasks = () => {
    if (currentTaskContent.length === 0) return;

    const tasks = fromMarkdownWithOffset(currentTaskContent.join('\n'), lineIndexBase);

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

  return Promise.resolve({ orphanTasks, milestones });
}

export function moveTaskToMilestone(taskLineIndex: number, targetMilestoneName: string | null, context: SyncContext) {
  if (!FileIOHelper.fileExists(context.markdownPath)) return Promise.resolve();

  const content = FileIOHelper.readFile(context.markdownPath);
  const lines = content.split('\n');

  const todoSectionIndex = TaskLineUtils.findTodoSectionIndex(lines);
  if (todoSectionIndex === -1) return Promise.resolve();

  const sectionEndIndex = TaskLineUtils.findNextSectionIndex(lines, todoSectionIndex);

  const actualLineIndex = todoSectionIndex + 1 + taskLineIndex + 1;
  if (actualLineIndex >= lines.length) return Promise.resolve();

  const taskLine = lines[actualLineIndex];
  const taskMatch = taskLine.match(TASK_ITEM_PATTERN);
  if (!taskMatch) return Promise.resolve();

  const taskIndent = TaskLineUtils.getIndentLevel(taskMatch);
  let taskEndIndex = actualLineIndex + 1;
  for (let i = actualLineIndex + 1; i < sectionEndIndex; i++) {
    const match = lines[i].match(TASK_ITEM_PATTERN);
    if (!match) {
      if (TypeGuardsHelper.isEmptyString(lines[i]) || MILESTONE_HEADER_PATTERN.test(lines[i])) break;
      continue;
    }
    const lineIndent = TaskLineUtils.getIndentLevel(match);
    if (lineIndent <= taskIndent) break;
    taskEndIndex = i + 1;
  }

  const taskLines = lines.slice(actualLineIndex, taskEndIndex);
  lines.splice(actualLineIndex, taskEndIndex - actualLineIndex);

  let insertIndex: number;

  if (targetMilestoneName === null) {
    let firstMilestoneIndex = -1;
    for (let j = todoSectionIndex + 1; j < sectionEndIndex; j++) {
      if (MILESTONE_HEADER_PATTERN.test(lines[j])) {
        firstMilestoneIndex = j;
        break;
      }
    }

    if (firstMilestoneIndex === -1) {
      let lastTaskIndex = todoSectionIndex;
      for (let k = todoSectionIndex + 1; k < sectionEndIndex; k++) {
        if (TASK_ITEM_PATTERN.test(lines[k])) {
          lastTaskIndex = k;
        }
      }
      insertIndex = lastTaskIndex + 1;
    } else {
      let insertBeforeMilestone = todoSectionIndex + 1;
      for (let k = todoSectionIndex + 1; k < firstMilestoneIndex; k++) {
        if (TASK_ITEM_PATTERN.test(lines[k])) {
          insertBeforeMilestone = k + 1;
        }
      }
      insertIndex = insertBeforeMilestone;
    }
  } else {
    let targetMilestoneIndex = -1;
    let nextMilestoneIndex = sectionEndIndex;

    for (let j = todoSectionIndex + 1; j < sectionEndIndex; j++) {
      const match = lines[j].match(MILESTONE_HEADER_PATTERN);
      if (match && match[1].trim() === targetMilestoneName) {
        targetMilestoneIndex = j;
      } else if (match && targetMilestoneIndex !== -1) {
        nextMilestoneIndex = j;
        break;
      }
    }

    if (targetMilestoneIndex === -1) return Promise.resolve();

    let lastTaskInMilestone = targetMilestoneIndex;
    for (let k = targetMilestoneIndex + 1; k < nextMilestoneIndex; k++) {
      if (TASK_ITEM_PATTERN.test(lines[k])) {
        lastTaskInMilestone = k;
      }
    }

    insertIndex = lastTaskInMilestone + 1;
  }

  lines.splice(insertIndex, 0, ...taskLines);

  FileIOHelper.writeFile(context.markdownPath, lines.join('\n'));
  return Promise.resolve();
}

export function createMilestone(name: string, context: SyncContext) {
  if (!FileIOHelper.fileExists(context.markdownPath)) return Promise.resolve();

  const content = FileIOHelper.readFile(context.markdownPath);
  const lines = content.split('\n');

  const todoSectionIndex = TaskLineUtils.findTodoSectionIndex(lines);
  if (todoSectionIndex === -1) return Promise.resolve();

  const sectionEndIndex = TaskLineUtils.findNextSectionIndex(lines, todoSectionIndex);

  let insertIndex = sectionEndIndex;
  for (let i = sectionEndIndex - 1; i > todoSectionIndex; i--) {
    if (TypeGuardsHelper.isNonEmptyString(lines[i])) {
      insertIndex = i + 1;
      break;
    }
  }

  const newMilestoneLines = ['', `## ${name}`, ''];
  lines.splice(insertIndex, 0, ...newMilestoneLines);

  FileIOHelper.writeFile(context.markdownPath, lines.join('\n'));
  return Promise.resolve();
}

export function reorderTask(taskLineIndex: number, targetLineIndex: number, position: Position, context: SyncContext) {
  if (!FileIOHelper.fileExists(context.markdownPath)) return Promise.resolve();
  if (taskLineIndex === targetLineIndex) return Promise.resolve();

  const content = FileIOHelper.readFile(context.markdownPath);
  const lines = content.split('\n');

  const todoSectionIndex = TaskLineUtils.findTodoSectionIndex(lines);
  if (todoSectionIndex === -1) return Promise.resolve();

  const sectionEndIndex = TaskLineUtils.findNextSectionIndex(lines, todoSectionIndex);

  const actualTaskIndex = todoSectionIndex + 1 + taskLineIndex + 1;
  const actualTargetIndex = todoSectionIndex + 1 + targetLineIndex + 1;

  if (actualTaskIndex >= sectionEndIndex || actualTargetIndex >= sectionEndIndex) return Promise.resolve();

  const taskLine = lines[actualTaskIndex];
  const taskMatch = taskLine.match(TASK_ITEM_PATTERN);
  if (!taskMatch) return Promise.resolve();

  const taskIndent = TaskLineUtils.getIndentLevel(taskMatch);
  let taskEndIndex = actualTaskIndex + 1;
  for (let i = actualTaskIndex + 1; i < sectionEndIndex; i++) {
    const match = lines[i].match(TASK_ITEM_PATTERN);
    if (!match) {
      if (TypeGuardsHelper.isEmptyString(lines[i]) || MILESTONE_HEADER_PATTERN.test(lines[i])) break;
      continue;
    }
    const lineIndent = TaskLineUtils.getIndentLevel(match);
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
  if (!targetMatch) return Promise.resolve();

  const targetIndent = TaskLineUtils.getIndentLevel(targetMatch);
  let targetEndIndex = newTargetIndex + 1;
  for (let i = newTargetIndex + 1; i < lines.length; i++) {
    const match = lines[i].match(TASK_ITEM_PATTERN);
    if (!match) {
      if (TypeGuardsHelper.isEmptyString(lines[i]) || MILESTONE_HEADER_PATTERN.test(lines[i])) break;
      continue;
    }
    const lineIndent = TaskLineUtils.getIndentLevel(match);
    if (lineIndent <= targetIndent) break;
    targetEndIndex = i + 1;
  }

  const indentDiff = targetIndent - taskIndent;
  const adjustedTaskLines = taskLines.map((line: string) => {
    const match = line.match(TASK_ITEM_PATTERN);
    if (!match) return line;

    const currentIndentSpaces = match[1].length;
    const newIndentSpaces = Math.max(0, currentIndentSpaces + indentDiff * 2);
    const newIndent = '  '.repeat(newIndentSpaces / 2);
    return line.replace(/^(\s*)/, newIndent);
  });

  const insertIndex = position === Position.Before ? newTargetIndex : targetEndIndex;
  lines.splice(insertIndex, 0, ...adjustedTaskLines);

  FileIOHelper.writeFile(context.markdownPath, lines.join('\n'));
  return Promise.resolve();
}
