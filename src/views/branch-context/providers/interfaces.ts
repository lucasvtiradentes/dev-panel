import type { BranchContext } from '../../../common/schemas/types';

export type SyncContext = {
  branchName: string;
  workspacePath: string;
  markdownPath: string;
  branchContext: BranchContext;
  sectionOptions?: Record<string, unknown>;
};

export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type TaskMeta = {
  assignee?: string;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: string;
  estimate?: string;
  externalId?: string;
  externalUrl?: string;
};

export type TaskNode = {
  text: string;
  status: TaskStatus;
  lineIndex: number;
  children: TaskNode[];
  meta: TaskMeta;
};

export type MilestoneNode = {
  name: string;
  lineIndex: number;
  tasks: TaskNode[];
};

export type NewTask = {
  text: string;
  parentIndex?: number;
};

export type SyncResult = {
  added: number;
  updated: number;
  deleted: number;
  conflicts?: { taskId: string; reason: string }[];
};

export type TaskSyncProvider = {
  fromMarkdown(content: string): TaskNode[];

  toMarkdown(tasks: TaskNode[]): string;

  getTasks(context: SyncContext): Promise<TaskNode[]>;

  getMilestones(context: SyncContext): Promise<{ orphanTasks: TaskNode[]; milestones: MilestoneNode[] }>;

  onStatusChange(lineIndex: number, newStatus: TaskStatus, context: SyncContext): Promise<void>;

  onCreateTask(task: NewTask, parentIndex: number | undefined, context: SyncContext): Promise<TaskNode>;

  onUpdateMeta(lineIndex: number, meta: Partial<TaskMeta>, context: SyncContext): Promise<void>;

  onEditText(lineIndex: number, newText: string, context: SyncContext): Promise<void>;

  onDeleteTask(lineIndex: number, context: SyncContext): Promise<void>;

  moveTaskToMilestone(taskLineIndex: number, targetMilestoneName: string | null, context: SyncContext): Promise<void>;

  reorderTask(
    taskLineIndex: number,
    targetLineIndex: number,
    position: 'before' | 'after',
    context: SyncContext,
  ): Promise<void>;

  createMilestone(name: string, context: SyncContext): Promise<void>;

  onSync(context: SyncContext): Promise<SyncResult>;

  cycleStatus(currentStatus: TaskStatus): TaskStatus;

  mapExternalStatus?(externalStatus: string): TaskStatus;

  mapLocalStatus?(localStatus: TaskStatus): string;
};

export type AutoSectionProvider = {
  fetch(context: SyncContext): Promise<string>;

  refreshInterval?: number;
};
