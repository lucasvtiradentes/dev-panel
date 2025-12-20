export {
  type PPConfig,
  type PPPrompt,
  type BranchContext,
  type BranchesState,
  type ConfigsState,
  type PromptsState,
  type ReplacementsState,
  type SourceState,
  type TasksState,
  type ToolsState,
  type WorkspaceUIState,
  DEFAULT_CONFIGS_STATE,
  DEFAULT_PROMPTS_STATE,
  DEFAULT_REPLACEMENTS_STATE,
  DEFAULT_SOURCE_STATE,
  DEFAULT_TASKS_STATE,
  DEFAULT_TOOLS_STATE,
  DEFAULT_WORKSPACE_UI_STATE,
} from './index';

export enum TaskSource {
  VSCode = 'vscode',
  Package = 'package',
  PP = 'pp',
}

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
