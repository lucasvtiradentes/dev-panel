import { z } from 'zod';
import { TASK_SOURCE_VALUES } from './types';

const TaskSourceEnum = z.enum(TASK_SOURCE_VALUES);

const SourceStateSchema = z.object({
  flatOrder: z.array(z.string()),
  groupOrder: z.array(z.string()),
  favorites: z.array(z.string()),
  hidden: z.array(z.string()),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
});

const TasksStateSchema = z.object({
  current: TaskSourceEnum,
  isGrouped: z.boolean(),
  vscode: SourceStateSchema,
  package: SourceStateSchema,
  devpanel: SourceStateSchema,
});

const ToolsStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  devpanel: SourceStateSchema,
  activeTools: z.array(z.string()),
});

const PromptsStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  devpanel: SourceStateSchema,
});

const VariablesStateSchema = z.object({
  isGrouped: z.boolean(),
});

const ReplacementsStateSchema = z.object({
  isGrouped: z.boolean(),
  activeReplacements: z.array(z.string()),
  lastBranch: z.string().optional(),
});

const BranchContextStateSchema = z.object({
  hideEmptySections: z.boolean().optional(),
});

const WorkspaceUIStateSchema = z.object({
  tasks: TasksStateSchema.optional(),
  tools: ToolsStateSchema.optional(),
  prompts: PromptsStateSchema.optional(),
  variables: VariablesStateSchema.optional(),
  replacements: ReplacementsStateSchema.optional(),
  branchContext: BranchContextStateSchema.optional(),
});

const TasksGlobalStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  devpanel: SourceStateSchema,
});

const GlobalUIStateSchema = z.object({
  tasks: TasksGlobalStateSchema.optional(),
  tools: ToolsStateSchema.optional(),
  prompts: PromptsStateSchema.optional(),
});

export type SourceState = z.infer<typeof SourceStateSchema>;
export type TasksState = z.infer<typeof TasksStateSchema>;
export type TasksGlobalState = z.infer<typeof TasksGlobalStateSchema>;
export type ToolsState = z.infer<typeof ToolsStateSchema>;
export type PromptsState = z.infer<typeof PromptsStateSchema>;
export type VariablesState = z.infer<typeof VariablesStateSchema>;
export type ReplacementsState = z.infer<typeof ReplacementsStateSchema>;
export type BranchContextState = z.infer<typeof BranchContextStateSchema>;
export type WorkspaceUIState = z.infer<typeof WorkspaceUIStateSchema>;
export type GlobalUIState = z.infer<typeof GlobalUIStateSchema>;

export const DEFAULT_SOURCE_STATE: SourceState = {
  flatOrder: [],
  groupOrder: [],
  favorites: [],
  hidden: [],
};

export const DEFAULT_TASKS_STATE: TasksState = {
  current: 'vscode',
  isGrouped: false,
  vscode: { ...DEFAULT_SOURCE_STATE },
  package: { ...DEFAULT_SOURCE_STATE },
  devpanel: { ...DEFAULT_SOURCE_STATE },
};

export const DEFAULT_TASKS_GLOBAL_STATE: TasksGlobalState = {
  isGrouped: false,
  devpanel: { ...DEFAULT_SOURCE_STATE },
};

export const DEFAULT_TOOLS_STATE: ToolsState = {
  isGrouped: false,
  devpanel: { ...DEFAULT_SOURCE_STATE },
  activeTools: [],
};

export const DEFAULT_PROMPTS_STATE: PromptsState = {
  isGrouped: false,
  devpanel: { ...DEFAULT_SOURCE_STATE },
};

export const DEFAULT_VARIABLES_STATE: VariablesState = {
  isGrouped: true,
};

export const DEFAULT_REPLACEMENTS_STATE: ReplacementsState = {
  isGrouped: true,
  activeReplacements: [],
};

export const DEFAULT_BRANCH_CONTEXT_STATE: BranchContextState = {
  hideEmptySections: false,
};

export const DEFAULT_WORKSPACE_UI_STATE: WorkspaceUIState = {
  tasks: DEFAULT_TASKS_STATE,
  tools: DEFAULT_TOOLS_STATE,
  prompts: DEFAULT_PROMPTS_STATE,
  variables: DEFAULT_VARIABLES_STATE,
  replacements: DEFAULT_REPLACEMENTS_STATE,
  branchContext: DEFAULT_BRANCH_CONTEXT_STATE,
};
