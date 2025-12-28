import type { ReplacementType } from './config-schema';

export type NormalizedPatchItem = {
  search: string[];
  replace: string[];
};

export type NormalizedPatchReplacement = {
  type: ReplacementType.Patch;
  name: string;
  target: string;
  description?: string;
  group?: string;
  patches: NormalizedPatchItem[];
};

export function normalizePatchItem(item: { search: unknown; replace: unknown }): NormalizedPatchItem {
  const normalizeValue = (value: unknown): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  };

  return {
    search: normalizeValue(item.search),
    replace: normalizeValue(item.replace),
  };
}

export enum TaskStatus {
  Todo = 'todo',
  Doing = 'doing',
  Done = 'done',
  Blocked = 'blocked',
}

export enum TaskPriority {
  Urgent = 'urgent',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  None = 'none',
}

export enum SectionType {
  Field = 'field',
  Text = 'text',
  Auto = 'auto',
}

export enum PluginAction {
  GetTasks = 'getTasks',
  SetStatus = 'setStatus',
  CreateTask = 'createTask',
  UpdateMeta = 'updateMeta',
  DeleteTask = 'deleteTask',
  Sync = 'sync',
}

export type SectionMetadata = Record<string, unknown>;

export type BranchContextMetadata = {
  lastCommitHash?: string;
  lastCommitMessage?: string;
  lastSyncedTime?: string;
  sections?: Record<string, SectionMetadata>;
};

export type BranchContext = {
  branchName?: string;
  branchType?: string;
  prLink?: string;
  linearLink?: string;
  objective?: string;
  requirements?: string;
  notes?: string;
  todos?: string;
  changedFiles?: string;
  metadata?: BranchContextMetadata;
};

export enum TaskSource {
  VSCode = 'vscode',
  Package = 'package',
  DevPanel = 'devpanel',
}

export const TASK_SOURCE_VALUES = Object.values(TaskSource) as [string, ...string[]];

type TaskSourceInfo = {
  id: TaskSource;
  label: string;
  icon: string;
};

export const TASK_SOURCES: TaskSourceInfo[] = [
  { id: TaskSource.VSCode, label: 'VSCode', icon: 'tools' },
  { id: TaskSource.Package, label: 'Package.json', icon: 'package' },
  { id: TaskSource.DevPanel, label: 'DevPanel', icon: 'beaker' },
];

type TaskIcon = {
  id: string;
  color?: string;
};

export type TaskDefinition = {
  label: string;
  hide?: boolean;
  icon?: TaskIcon;
  group?: string;
  type?: string;
  command?: string;
  detail?: string;
};

export type TasksJson = {
  version?: string;
  tasks: TaskDefinition[];
};

export type CodeWorkspaceFile = {
  folders?: { path: string }[];
  tasks?: TasksJson;
};
