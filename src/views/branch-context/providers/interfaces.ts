import type { BranchContext } from '../../../common/schemas/types';

export type SyncContext = {
  branchName: string;
  workspacePath: string;
  markdownPath: string;
  branchContext: BranchContext;
  sectionOptions?: Record<string, unknown>;
};

export type TaskNode = {
  text: string;
  isChecked: boolean;
  lineIndex: number;
  children: TaskNode[];
  isHeading?: boolean;
};

export type NewTask = {
  text: string;
  parentIndex?: number;
};

export type TaskSyncProvider = {
  fromMarkdown(content: string): TaskNode[];

  toMarkdown(tasks: TaskNode[]): string;

  getTasks(context: SyncContext): Promise<TaskNode[]>;

  onToggleTask(lineIndex: number, context: SyncContext): Promise<void>;

  onCreateTask(task: NewTask, context: SyncContext): Promise<void>;

  onSync(context: SyncContext): Promise<void>;
};

export type AutoSectionProvider = {
  fetch(context: SyncContext): Promise<string>;

  refreshInterval?: number;
};
