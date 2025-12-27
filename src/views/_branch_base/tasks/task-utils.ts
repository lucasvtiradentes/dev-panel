import {
  TASK_META_ASSIGNEE_PATTERN,
  TASK_META_BLOCK_PATTERN,
  TASK_META_DUE_DATE_PATTERN,
  TASK_META_ESTIMATE_PATTERN,
  TASK_META_EXTERNAL_ID_PATTERN,
  TASK_META_PRIORITY_PATTERN,
  TASK_META_TAG_PATTERN,
} from '../../../common/constants';
import { TaskPriority, TaskStatus } from '../../../common/schemas';
import type { TaskMeta } from '../providers/interfaces';

export function parseStatusMarker(marker: string): TaskStatus {
  const char = marker.toLowerCase();
  switch (char) {
    case 'x':
      return TaskStatus.Done;
    case '>':
      return TaskStatus.Doing;
    case '!':
      return TaskStatus.Blocked;
    default:
      return TaskStatus.Todo;
  }
}

export function statusToMarker(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.Done:
      return 'x';
    case TaskStatus.Doing:
      return '>';
    case TaskStatus.Blocked:
      return '!';
    default:
      return ' ';
  }
}

export function cycleStatus(currentStatus: TaskStatus): TaskStatus {
  const cycle: TaskStatus[] = [TaskStatus.Todo, TaskStatus.Doing, TaskStatus.Done];
  const idx = cycle.indexOf(currentStatus);
  if (idx === -1) return TaskStatus.Todo;
  return cycle[(idx + 1) % cycle.length];
}

type ParsedTaskText = {
  text: string;
  meta: TaskMeta;
};

export function parseTaskText(rawText: string): ParsedTaskText {
  const meta: TaskMeta = {};
  let text = rawText.trim();

  const metaMatch = text.match(TASK_META_BLOCK_PATTERN);
  if (!metaMatch) {
    return { text, meta };
  }

  const metaBlock = metaMatch[1];
  text = text.replace(TASK_META_BLOCK_PATTERN, '').trim();

  const assigneeMatch = metaBlock.match(TASK_META_ASSIGNEE_PATTERN);
  if (assigneeMatch) {
    meta.assignee = assigneeMatch[0].slice(1);
  }

  const priorityMatch = metaBlock.match(TASK_META_PRIORITY_PATTERN);
  if (priorityMatch) {
    meta.priority = priorityMatch[1].toLowerCase() as TaskPriority;
  }

  const tags: string[] = [];
  const tagRegex = new RegExp(TASK_META_TAG_PATTERN.source, 'g');
  for (const tagMatch of metaBlock.matchAll(tagRegex)) {
    tags.push(tagMatch[1]);
  }
  if (tags.length > 0) {
    meta.tags = tags;
  }

  const dueDateMatch = metaBlock.match(TASK_META_DUE_DATE_PATTERN);
  if (dueDateMatch) {
    meta.dueDate = dueDateMatch[1];
  }

  const estimateMatch = metaBlock.match(TASK_META_ESTIMATE_PATTERN);
  if (estimateMatch) {
    meta.estimate = estimateMatch[1];
  }

  const externalIdMatch = metaBlock.match(TASK_META_EXTERNAL_ID_PATTERN);
  if (externalIdMatch) {
    meta.externalId = externalIdMatch[1];
  }

  return { text, meta };
}

function serializeTaskMeta(meta: TaskMeta): string {
  const parts: string[] = [];

  if (meta.assignee) {
    parts.push(`@${meta.assignee}`);
  }

  if (meta.priority && meta.priority !== TaskPriority.None) {
    parts.push(`!${meta.priority}`);
  }

  if (meta.tags && meta.tags.length > 0) {
    parts.push(...meta.tags.map((t) => `#${t}`));
  }

  if (meta.dueDate) {
    parts.push(`due:${meta.dueDate}`);
  }

  if (meta.estimate) {
    parts.push(`est:${meta.estimate}`);
  }

  if (meta.externalId) {
    parts.push(`id:${meta.externalId}`);
  }

  return parts.length > 0 ? `<${parts.join(' ')}>` : '';
}

export function formatTaskLine(text: string, meta: TaskMeta): string {
  const metaStr = serializeTaskMeta(meta);
  return metaStr ? `${text} ${metaStr}` : text;
}
