import type { PluginAction, TaskStatus } from '../../../common/schemas';
import type { SyncResult, TaskMeta, TaskNode } from './interfaces';

export type { PluginAction, TaskStatus };

export type PluginRequest = {
  action: PluginAction;
  context: {
    branchName: string;
    workspacePath: string;
    markdownPath: string;
    branchContext: Record<string, unknown>;
    sectionOptions?: Record<string, unknown>;
  };
  payload?: unknown;
};

export type GetTasksResponse = {
  success: boolean;
  tasks: TaskNode[];
  error?: string;
};

export type SetStatusPayload = {
  lineIndex: number;
  newStatus: TaskStatus;
};

export type SetStatusResponse = {
  success: boolean;
  error?: string;
};

export type CreateTaskPayload = {
  text: string;
  parentIndex?: number;
};

export type CreateTaskResponse = {
  success: boolean;
  task?: TaskNode;
  error?: string;
};

export type UpdateMetaPayload = {
  lineIndex: number;
  meta: Partial<TaskMeta>;
};

export type UpdateMetaResponse = {
  success: boolean;
  error?: string;
};

export type DeleteTaskPayload = {
  lineIndex: number;
};

export type DeleteTaskResponse = {
  success: boolean;
  error?: string;
};

export type SyncResponse = {
  success: boolean;
  result?: SyncResult;
  error?: string;
};
