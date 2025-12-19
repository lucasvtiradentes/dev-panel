import type { SourceState } from './schemas';

export {
  type BPMConfig,
  type BPMConfigItem,
  type BPMPrompt,
  type BPMReplacement,
  type BPMScript,
  type BPMState,
  type BPMTool,
  type BranchContext,
  type BranchesState,
  type PromptsState,
  type TasksState,
  type ToolsState,
  DEFAULT_PROMPTS_STATE,
  DEFAULT_SOURCE_STATE,
  DEFAULT_TASKS_STATE,
  DEFAULT_TOOLS_STATE,
} from './schemas';

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

export type { SourceState };
export type TaskSourceState = SourceState;
export type ToolSourceState = SourceState;
