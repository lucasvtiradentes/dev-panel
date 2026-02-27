import { z } from 'zod';
import { AIProvider } from './config-schema';
import { DEFAULT_SOURCE_STATE, SourceStateSchema } from './shared-state.schema';
import { TASK_SOURCE_VALUES } from './types';

const TaskSourceEnum = z.enum(TASK_SOURCE_VALUES);

const TasksStateSchema = z.object({
  current: TaskSourceEnum,
  isGrouped: z.boolean(),
  vscode: SourceStateSchema,
  package: SourceStateSchema,
  devpanel: SourceStateSchema,
});

const PromptsStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  devpanel: SourceStateSchema,
  aiProvider: z.nativeEnum(AIProvider).optional(),
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
  prompts: PromptsStateSchema.optional(),
  variables: VariablesStateSchema.optional(),
  replacements: ReplacementsStateSchema.optional(),
});

export type TasksState = z.infer<typeof TasksStateSchema>;
export type PromptsState = z.infer<typeof PromptsStateSchema>;
export type VariablesState = z.infer<typeof VariablesStateSchema>;
export type ReplacementsState = z.infer<typeof ReplacementsStateSchema>;
export type WorkspaceUIState = z.infer<typeof WorkspaceUIStateSchema>;

export const DEFAULT_TASKS_STATE: TasksState = {
  current: 'vscode',
  isGrouped: false,
  vscode: { ...DEFAULT_SOURCE_STATE },
  package: { ...DEFAULT_SOURCE_STATE },
  devpanel: { ...DEFAULT_SOURCE_STATE },
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
