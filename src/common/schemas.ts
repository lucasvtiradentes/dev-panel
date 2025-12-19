import { z } from 'zod';

export const TaskSourceEnum = z.enum(['vscode', 'package', 'bpm']);

const BPMScriptSchema = z
  .object({
    name: z.string().describe('Unique identifier for the script'),
    command: z.string().describe('Shell command to execute'),
    icon: z.string().optional().describe('VSCode ThemeIcon id (e.g. "terminal", "play")'),
    group: z.string().optional().describe('Group name for organizing scripts'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
  })
  .describe('A script that can be executed from the Tasks view');

const BPMToolSchema = z
  .object({
    name: z.string().describe('Unique identifier for the tool'),
    command: z.string().describe('Shell command to execute'),
    icon: z.string().optional().describe('VSCode ThemeIcon id (e.g. "tools", "gear")'),
    group: z.string().optional().describe('Group name for organizing tools'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
  })
  .describe('A tool that can be executed from the Tools view');

const BPMPromptSchema = z
  .object({
    name: z.string().describe('Unique identifier for the prompt'),
    file: z.string().describe('Path to prompt file relative to .bpm/prompts/'),
    icon: z.string().optional().describe('VSCode ThemeIcon id (e.g. "comment", "sparkle")'),
    group: z.string().optional().describe('Group name for organizing prompts'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
  })
  .describe('A prompt that can be executed in Claude Code');

const BPMConfigItemSchema = z
  .object({
    name: z.string().describe('Unique identifier for the config'),
    kind: z.enum(['choose', 'toggle', 'input', 'multi-select', 'file', 'folder']).describe('Type of config input'),
    options: z.array(z.string()).optional().describe('Available options for choose/multi-select kinds'),
    command: z.string().optional().describe('Shell command to execute when value changes'),
    icon: z.string().optional().describe('VSCode ThemeIcon id'),
    description: z.string().optional().describe('Human-readable description'),
    default: z
      .union([z.string(), z.boolean(), z.array(z.string())])
      .optional()
      .describe('Default value'),
    group: z.string().optional().describe('Group name for organizing configs'),
  })
  .describe('A configuration option shown in the Configs view');

const BPMReplacementPatchSchema = z.object({
  search: z.string().describe('Text or pattern to search for'),
  replace: z.string().describe('Replacement text'),
});

const BPMReplacementSchema = z
  .object({
    name: z.string().describe('Unique identifier for the replacement'),
    type: z.enum(['patch']).describe('Type of replacement'),
    description: z.string().optional().describe('Human-readable description'),
    target: z.string().describe('Target file path relative to workspace'),
    onBranchChange: z.enum(['revert', 'keep']).optional().describe('What to do when git branch changes'),
    patches: z.array(BPMReplacementPatchSchema).describe('List of search/replace patches'),
    group: z.string().optional().describe('Group name for organizing replacements'),
  })
  .describe('A file replacement/patch shown in the Replacements view');

export const BPMConfigSchema = z
  .object({
    $schema: z.string().optional().describe('JSON Schema reference'),
    configs: z.array(BPMConfigItemSchema).optional().describe('Configuration options'),
    replacements: z.array(BPMReplacementSchema).optional().describe('File replacements/patches'),
    scripts: z.array(BPMScriptSchema).optional().describe('Executable scripts'),
    tools: z.array(BPMToolSchema).optional().describe('Executable tools'),
    prompts: z.array(BPMPromptSchema).optional().describe('Claude Code prompts'),
  })
  .describe('BPM configuration file');

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

export const PromptsStateSchema = z.object({
  isGrouped: z.boolean(),
  bpm: SourceStateSchema,
});

export const BranchContextSchema = z.object({
  objective: z.string().optional(),
  linearIssue: z.string().optional(),
  notes: z.string().optional(),
});

export const BranchesStateSchema = z.record(z.string(), BranchContextSchema);

export const BPMStateSchema = z.object({
  debug: z.boolean().optional(),
  activeReplacements: z.array(z.string()).optional(),
  lastBranch: z.string().optional(),
  environment: z.string().optional(),
  tasks: TasksStateSchema.optional(),
  tools: ToolsStateSchema.optional(),
  prompts: PromptsStateSchema.optional(),
  branches: BranchesStateSchema.optional(),
});

export type TaskSource = z.infer<typeof TaskSourceEnum>;
export type BPMScript = z.infer<typeof BPMScriptSchema>;
export type BPMTool = z.infer<typeof BPMToolSchema>;
export type BPMPrompt = z.infer<typeof BPMPromptSchema>;
export type BPMConfigItem = z.infer<typeof BPMConfigItemSchema>;
export type BPMReplacement = z.infer<typeof BPMReplacementSchema>;
export type BPMConfig = z.infer<typeof BPMConfigSchema>;
export type SourceState = z.infer<typeof SourceStateSchema>;
export type TasksState = z.infer<typeof TasksStateSchema>;
export type ToolsState = z.infer<typeof ToolsStateSchema>;
export type PromptsState = z.infer<typeof PromptsStateSchema>;
export type BranchContext = z.infer<typeof BranchContextSchema>;
export type BranchesState = z.infer<typeof BranchesStateSchema>;
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

export const DEFAULT_PROMPTS_STATE: PromptsState = {
  isGrouped: false,
  bpm: { ...DEFAULT_SOURCE_STATE },
};
