import { z } from 'zod';

const TaskSourceEnum = z.enum(['vscode', 'package', 'pp']);

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
  packageJson: SourceStateSchema,
  pp: SourceStateSchema,
});

const ToolsStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  pp: SourceStateSchema,
});

const PromptsStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  pp: SourceStateSchema,
});

const VariablesStateSchema = z.object({
  isGrouped: z.boolean(),
});

const ReplacementsStateSchema = z.object({
  isGrouped: z.boolean(),
  activeReplacements: z.array(z.string()),
  lastBranch: z.string().optional(),
});

const WorkspaceUIStateSchema = z.object({
  tasks: TasksStateSchema.optional(),
  tools: ToolsStateSchema.optional(),
  prompts: PromptsStateSchema.optional(),
  variables: VariablesStateSchema.optional(),
  replacements: ReplacementsStateSchema.optional(),
});

export type SourceState = z.infer<typeof SourceStateSchema>;
export type TasksState = z.infer<typeof TasksStateSchema>;
export type ToolsState = z.infer<typeof ToolsStateSchema>;
export type PromptsState = z.infer<typeof PromptsStateSchema>;
export type VariablesState = z.infer<typeof VariablesStateSchema>;
export type ReplacementsState = z.infer<typeof ReplacementsStateSchema>;
export type WorkspaceUIState = z.infer<typeof WorkspaceUIStateSchema>;

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
  packageJson: { ...DEFAULT_SOURCE_STATE },
  pp: { ...DEFAULT_SOURCE_STATE },
};

export const DEFAULT_TOOLS_STATE: ToolsState = {
  isGrouped: false,
  pp: { ...DEFAULT_SOURCE_STATE },
};

export const DEFAULT_PROMPTS_STATE: PromptsState = {
  isGrouped: false,
  pp: { ...DEFAULT_SOURCE_STATE },
};

export const DEFAULT_VARIABLES_STATE: VariablesState = {
  isGrouped: true,
};

export const DEFAULT_REPLACEMENTS_STATE: ReplacementsState = {
  isGrouped: true,
  activeReplacements: [],
};

export const DEFAULT_WORKSPACE_UI_STATE: WorkspaceUIState = {
  tasks: DEFAULT_TASKS_STATE,
  tools: DEFAULT_TOOLS_STATE,
  prompts: DEFAULT_PROMPTS_STATE,
  variables: DEFAULT_VARIABLES_STATE,
  replacements: DEFAULT_REPLACEMENTS_STATE,
};
