import { z } from 'zod';
import { DEFAULT_SOURCE_STATE, SourceStateSchema } from './shared-state.schema';
import { TASK_SOURCE_VALUES } from './types';

const TaskSourceEnum = z.enum(TASK_SOURCE_VALUES);

const TasksStateSchema = z.object({
  current: TaskSourceEnum,
  isGrouped: z.boolean(),
  taskScanIgnorePaths: z.array(z.string()),
  vscode: SourceStateSchema,
  package: SourceStateSchema,
  devpanel: SourceStateSchema,
  makefile: SourceStateSchema,
});

const VariablesStateSchema = z.object({
  isGrouped: z.boolean(),
});

const ReplacementsStateSchema = z.object({
  isGrouped: z.boolean(),
  activeReplacements: z.array(z.string()),
  lastBranch: z.string().optional(),
});

const ExcludesViewStateSchema = z.object({
  isGrouped: z.boolean(),
  showAll: z.boolean(),
});

const WorkspaceUIStateSchema = z.object({
  tasks: TasksStateSchema.optional(),
  variables: VariablesStateSchema.optional(),
  replacements: ReplacementsStateSchema.optional(),
  gitExcludes: ExcludesViewStateSchema.optional(),
  vscodeExcludes: ExcludesViewStateSchema.optional(),
});

export type TasksState = z.infer<typeof TasksStateSchema>;
export type VariablesState = z.infer<typeof VariablesStateSchema>;
export type ReplacementsState = z.infer<typeof ReplacementsStateSchema>;
export type ExcludesViewState = z.infer<typeof ExcludesViewStateSchema>;
export type WorkspaceUIState = z.infer<typeof WorkspaceUIStateSchema>;

export const DEFAULT_TASKS_STATE: TasksState = {
  current: 'vscode',
  isGrouped: false,
  taskScanIgnorePaths: [],
  vscode: { ...DEFAULT_SOURCE_STATE },
  package: { ...DEFAULT_SOURCE_STATE },
  devpanel: { ...DEFAULT_SOURCE_STATE },
  makefile: { ...DEFAULT_SOURCE_STATE },
};

export const DEFAULT_VARIABLES_STATE: VariablesState = {
  isGrouped: true,
};

export const DEFAULT_REPLACEMENTS_STATE: ReplacementsState = {
  isGrouped: true,
  activeReplacements: [],
};

export const DEFAULT_EXCLUDES_VIEW_STATE: ExcludesViewState = {
  isGrouped: false,
  showAll: true,
};
