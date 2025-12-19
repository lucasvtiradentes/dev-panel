export enum TaskSource {
  VSCode = 'vscode',
  Package = 'package',
  BPM = 'bpm',
}

export type TaskSourceInfo = {
  id: TaskSource;
  label: string;
  icon: string;
};

export const TASK_SOURCES: TaskSourceInfo[] = [
  { id: TaskSource.VSCode, label: 'VSCode', icon: 'tools' },
  { id: TaskSource.Package, label: 'Package.json', icon: 'package' },
  { id: TaskSource.BPM, label: 'BPM', icon: 'beaker' },
];

type TaskIcon = {
  id: string;
  color?: string;
};

export type BPMScript = {
  name: string;
  command: string;
  icon?: string;
  group?: string;
  description?: string;
};

export type BPMConfig = {
  configs?: unknown[];
  replacements?: unknown[];
  scripts?: BPMScript[];
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

export type TaskSourceState = {
  flatOrder: string[];
  groupOrder: string[];
  favorites: string[];
  hidden: string[];
};

export type TasksState = {
  current: TaskSource;
  isGrouped: boolean;
  vscode: TaskSourceState;
  packageJson: TaskSourceState;
  bpm: TaskSourceState;
};

export const DEFAULT_TASKS_STATE: TasksState = {
  current: TaskSource.VSCode,
  isGrouped: false,
  vscode: { flatOrder: [], groupOrder: [], favorites: [], hidden: [] },
  packageJson: { flatOrder: [], groupOrder: [], favorites: [], hidden: [] },
  bpm: { flatOrder: [], groupOrder: [], favorites: [], hidden: [] },
};
