import { z } from 'zod';

export const TaskSourceEnum = z.enum(['vscode', 'package', 'bpm']);

const BPMScriptSchema = z.object({
  name: z.string(),
  command: z.string(),
  icon: z.string().optional(),
  group: z.string().optional(),
  description: z.string().optional(),
});

const BPMToolSchema = z.object({
  name: z.string(),
  command: z.string(),
  icon: z.string().optional(),
  group: z.string().optional(),
  description: z.string().optional(),
});

const BPMConfigItemSchema = z.object({
  name: z.string(),
  kind: z.enum(['choose', 'toggle', 'input', 'multi-select', 'file', 'folder']),
  options: z.array(z.string()).optional(),
  command: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  default: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(),
  group: z.string().optional(),
});

const BPMReplacementPatchSchema = z.object({
  search: z.string(),
  replace: z.string(),
});

const BPMReplacementSchema = z.object({
  name: z.string(),
  type: z.enum(['patch']),
  description: z.string().optional(),
  target: z.string(),
  onBranchChange: z.enum(['revert', 'keep']).optional(),
  patches: z.array(BPMReplacementPatchSchema),
  group: z.string().optional(),
});

export const BPMConfigSchema = z.object({
  configs: z.array(BPMConfigItemSchema).optional(),
  replacements: z.array(BPMReplacementSchema).optional(),
  scripts: z.array(BPMScriptSchema).optional(),
  tools: z.array(BPMToolSchema).optional(),
});

const SourceStateSchema = z.object({
  flatOrder: z.array(z.string()),
  groupOrder: z.array(z.string()),
  favorites: z.array(z.string()),
  hidden: z.array(z.string()),
});

export const TasksStateSchema = z.object({
  current: TaskSourceEnum,
  isGrouped: z.boolean(),
  vscode: SourceStateSchema,
  packageJson: SourceStateSchema,
  bpm: SourceStateSchema,
});

export const ToolsStateSchema = z.object({
  isGrouped: z.boolean(),
  bpm: SourceStateSchema,
});

export const BPMStateSchema = z.object({
  debug: z.boolean().optional(),
  activeReplacements: z.array(z.string()).optional(),
  lastBranch: z.string().optional(),
  environment: z.string().optional(),
  tasks: TasksStateSchema.optional(),
  tools: ToolsStateSchema.optional(),
});

export type TaskSource = z.infer<typeof TaskSourceEnum>;
export type BPMScript = z.infer<typeof BPMScriptSchema>;
export type BPMTool = z.infer<typeof BPMToolSchema>;
export type BPMConfigItem = z.infer<typeof BPMConfigItemSchema>;
export type BPMReplacement = z.infer<typeof BPMReplacementSchema>;
export type BPMConfig = z.infer<typeof BPMConfigSchema>;
export type SourceState = z.infer<typeof SourceStateSchema>;
export type TasksState = z.infer<typeof TasksStateSchema>;
export type ToolsState = z.infer<typeof ToolsStateSchema>;
export type BPMState = z.infer<typeof BPMStateSchema>;

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
  bpm: { ...DEFAULT_SOURCE_STATE },
};

export const DEFAULT_TOOLS_STATE: ToolsState = {
  isGrouped: false,
  bpm: { ...DEFAULT_SOURCE_STATE },
};
