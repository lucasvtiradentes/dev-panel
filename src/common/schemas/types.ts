export type BranchContext = {
  branchName?: string;
  prLink?: string;
  linearLink?: string;
  objective?: string;
  requirements?: string;
  notes?: string;
  todos?: string;
  changedFiles?: string;
};

export enum TaskSource {
  VSCode = 'vscode',
  Package = 'package',
  PP = 'pp',
}

export enum TaskSourceKey {
  VSCode = 'vscode',
  Package = 'packageJson',
  PP = 'pp',
}

export const TASK_SOURCE_TO_KEY: Record<TaskSource, TaskSourceKey> = {
  [TaskSource.VSCode]: TaskSourceKey.VSCode,
  [TaskSource.Package]: TaskSourceKey.Package,
  [TaskSource.PP]: TaskSourceKey.PP,
};

export type TaskSourceInfo = {
  id: TaskSource;
  label: string;
  icon: string;
};

export const TASK_SOURCES: TaskSourceInfo[] = [
  { id: TaskSource.VSCode, label: 'VSCode', icon: 'tools' },
  { id: TaskSource.Package, label: 'Package.json', icon: 'package' },
  { id: TaskSource.PP, label: 'PP', icon: 'beaker' },
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
