import * as vscode from 'vscode';
import { type TaskPriority, TaskStatus } from '../../common/schemas';
import { VscodeColor, VscodeIcon } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { MarkdownString, ThemeIcon } from '../../common/vscode/vscode-types';
import type { TaskMeta } from '../_branch_base';

export function formatTaskDescription(meta: TaskMeta, status: TaskStatus): string {
  if (status === TaskStatus.Done) {
    return 'done';
  }

  const parts: string[] = [];

  if (meta.assignee) {
    parts.push(`@${meta.assignee}`);
  }

  if (meta.priority && meta.priority !== 'none') {
    parts.push(`!${meta.priority}`);
  }

  if (meta.dueDate) {
    const formatted = formatDueDate(meta.dueDate);
    parts.push(formatted);
  }

  if (meta.tags && meta.tags.length > 0 && parts.length === 0) {
    parts.push(meta.tags.map((t) => `#${t}`).join(' '));
  }

  return parts.join(' · ');
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `⚠️ ${Math.abs(diffDays)}d overdue`;
  }
  if (diffDays === 0) {
    return '📅 today';
  }
  if (diffDays === 1) {
    return '📅 tomorrow';
  }
  if (diffDays <= 7) {
    return `📅 ${diffDays}d`;
  }
  return `📅 ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function isOverdue(meta: TaskMeta): boolean {
  if (!meta.dueDate) return false;
  const date = new Date(meta.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function getStatusIcon(status: TaskStatus, meta: TaskMeta): ThemeIcon {
  const overdue = isOverdue(meta);

  switch (status) {
    case 'done':
      return VscodeIcons.TaskDone;

    case 'doing':
      return VscodeIcons.TaskDoing;

    case 'blocked':
      return VscodeIcons.TaskBlocked;

    default: {
      if (overdue) {
        return VscodeIcons.TaskOverdue;
      }

      const priorityColor = getPriorityColor(meta.priority);
      if (priorityColor) {
        return VscodeHelper.createIcon(VscodeIcon.CircleLargeOutline, priorityColor);
      }

      return VscodeIcons.TaskDefault;
    }
  }
}

function getPriorityColor(priority: TaskPriority | undefined): VscodeColor | undefined {
  switch (priority) {
    case 'urgent':
      return VscodeColor.ErrorForeground;
    case 'high':
      return VscodeColor.EditorWarningForeground;
    case 'medium':
      return VscodeColor.EditorInfoForeground;
    default:
      return undefined;
  }
}

export function formatTaskTooltip(text: string, status: TaskStatus, meta: TaskMeta): MarkdownString {
  const md = new vscode.MarkdownString();
  md.supportHtml = true;

  md.appendMarkdown(`**${text}**\n\n`);
  md.appendMarkdown(`Status: \`${status}\`\n\n`);

  if (meta.assignee) {
    md.appendMarkdown(`Assignee: @${meta.assignee}\n\n`);
  }

  if (meta.priority && meta.priority !== 'none') {
    const emoji = getPriorityEmoji(meta.priority);
    md.appendMarkdown(`Priority: ${emoji} ${meta.priority}\n\n`);
  }

  if (meta.dueDate) {
    const overdue = isOverdue(meta);
    const prefix = overdue ? '⚠️ OVERDUE: ' : '📅 Due: ';
    md.appendMarkdown(`${prefix}${meta.dueDate}\n\n`);
  }

  if (meta.tags && meta.tags.length > 0) {
    md.appendMarkdown(`Tags: ${meta.tags.map((t) => `\`#${t}\``).join(' ')}\n\n`);
  }

  if (meta.estimate) {
    md.appendMarkdown(`Estimate: ${meta.estimate}\n\n`);
  }

  if (meta.externalId) {
    md.appendMarkdown(`External: \`${meta.externalId}\`\n\n`);
  }

  return md;
}

function getPriorityEmoji(priority: TaskPriority): string {
  switch (priority) {
    case 'urgent':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔵';
    default:
      return '⚪';
  }
}
