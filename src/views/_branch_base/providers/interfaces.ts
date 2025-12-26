import type { Position } from '../../../common/constants/enums';
import type { BranchContext, TaskPriority, TaskStatus } from '../../../common/schemas';

export type SyncContext = {
  branchName: string;
  workspacePath: string;
  markdownPath: string;
  branchContext: BranchContext;
  sectionOptions?: Record<string, unknown>;
};

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

export type TaskStats = {
  completed: number;
  total: number;
};

export type TaskSyncProvider = {
  fromMarkdown(content: string): TaskNode[];

  toMarkdown(tasks: TaskNode[]): string;

  getTasks(context: SyncContext): Promise<TaskNode[]>;

  getTaskStats(context: SyncContext): Promise<TaskStats>;

  getMilestones(context: SyncContext): Promise<{ orphanTasks: TaskNode[]; milestones: MilestoneNode[] }>;

  onStatusChange(lineIndex: number, newStatus: TaskStatus, context: SyncContext): Promise<void>;

  onCreateTask(task: NewTask, parentIndex: number | undefined, context: SyncContext): Promise<TaskNode>;

  onUpdateMeta(lineIndex: number, meta: Partial<TaskMeta>, context: SyncContext): Promise<void>;

  onEditText(lineIndex: number, newText: string, context: SyncContext): Promise<void>;

  onDeleteTask(lineIndex: number, context: SyncContext): Promise<void>;

  moveTaskToMilestone(taskLineIndex: number, targetMilestoneName: string | null, context: SyncContext): Promise<void>;

  reorderTask(taskLineIndex: number, targetLineIndex: number, position: Position, context: SyncContext): Promise<void>;

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
