import * as fs from 'node:fs';
import { MARKDOWN_SECTION_HEADER_PATTERN, TODO_SECTION_HEADER_PATTERN } from '../../../../common/constants';
import type { Position } from '../../../../common/constants/enums';
import type { TaskStatus } from '../../../../common/schemas';
import * as milestoneOps from '../../tasks/milestone-operations';
import * as taskCrud from '../../tasks/task-crud';
import { fromMarkdown, toMarkdown } from '../../tasks/task-markdown';
import { cycleStatus as cycleStatusUtil } from '../../tasks/task-utils';
import type {
  MilestoneNode,
  NewTask,
  SyncContext,
  SyncResult,
  TaskMeta,
  TaskNode,
  TaskSyncProvider,
} from '../interfaces';

export class DefaultTaskProvider implements TaskSyncProvider {
  fromMarkdown = fromMarkdown;
  toMarkdown = toMarkdown;

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

  async getTaskStats(context: SyncContext): Promise<{ completed: number; total: number }> {
    const tasks = await this.getTasks(context);
    return this.countTaskStats(tasks);
  }

  private countTaskStats(nodes: TaskNode[]): { completed: number; total: number } {
    let completed = 0;
    let total = 0;

    for (const node of nodes) {
      total++;
      if (node.status === 'done') completed++;

      const childStats = this.countTaskStats(node.children);
      completed += childStats.completed;
      total += childStats.total;
    }

    return { completed, total };
  }

  getMilestones(context: SyncContext): Promise<{ orphanTasks: TaskNode[]; milestones: MilestoneNode[] }> {
    return milestoneOps.getMilestones(context);
  }

  moveTaskToMilestone(taskLineIndex: number, targetMilestoneName: string | null, context: SyncContext) {
    return milestoneOps.moveTaskToMilestone(taskLineIndex, targetMilestoneName, context);
  }

  createMilestone(name: string, context: SyncContext) {
    return milestoneOps.createMilestone(name, context);
  }

  reorderTask(taskLineIndex: number, targetLineIndex: number, position: Position, context: SyncContext) {
    return milestoneOps.reorderTask(taskLineIndex, targetLineIndex, position, context);
  }

  onStatusChange(lineIndex: number, newStatus: TaskStatus, context: SyncContext) {
    return taskCrud.onStatusChange(lineIndex, newStatus, context);
  }

  onCreateTask(task: NewTask, parentIndex: number | undefined, context: SyncContext): Promise<TaskNode> {
    return taskCrud.onCreateTask(task, parentIndex, context);
  }

  onUpdateMeta(lineIndex: number, metaUpdate: Partial<TaskMeta>, context: SyncContext) {
    return taskCrud.onUpdateMeta(lineIndex, metaUpdate, context);
  }

  onEditText(lineIndex: number, newText: string, context: SyncContext) {
    return taskCrud.onEditText(lineIndex, newText, context);
  }

  onDeleteTask(lineIndex: number, context: SyncContext) {
    return taskCrud.onDeleteTask(lineIndex, context);
  }

  onSync(): Promise<SyncResult> {
    return Promise.resolve({ added: 0, updated: 0, deleted: 0 });
  }

  cycleStatus(currentStatus: TaskStatus): TaskStatus {
    return cycleStatusUtil(currentStatus);
  }
}
