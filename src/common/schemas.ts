import { z } from 'zod';

export enum PromptInputType {
  File = 'file',
  Files = 'files',
  Folder = 'folder',
  Folders = 'folders',
  Text = 'text',
  Number = 'number',
  Confirm = 'confirm',
  Choice = 'choice',
  Multichoice = 'multichoice',
}

export enum SelectionStyle {
  Flat = 'flat',
  Interactive = 'interactive',
}

export enum AIProvider {
  Claude = 'claude',
  Gemini = 'gemini',
  CursorAgent = 'cursor-agent',
}

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

const BPMPromptInputSchema = z
  .object({
    name: z.string().describe('Variable name used in prompt template as {{name}}'),
    type: z.nativeEnum(PromptInputType).describe('Input type'),
    label: z.string().describe('Label shown in the input dialog'),
    placeholder: z.string().optional().describe('Placeholder text for text/number inputs'),
    options: z.array(z.string()).optional().describe('Available options for choice/multichoice types'),
    selectionStyle: z
      .nativeEnum(SelectionStyle)
      .optional()
      .describe('Selection style for file/folder inputs. Overrides global setting'),
    excludes: z
      .array(z.string())
      .optional()
      .describe('Glob patterns to exclude for this input. Overrides global excludes'),
  })
  .describe('An input required before running the prompt');

const BPMPromptSchema = z
  .object({
    name: z.string().describe('Unique identifier for the prompt'),
    file: z.string().describe('Path to prompt file relative to .bpm/prompts/'),
    icon: z.string().optional().describe('VSCode ThemeIcon id (e.g. "comment", "sparkle")'),
    group: z.string().optional().describe('Group name for organizing prompts'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
    inputs: z.array(BPMPromptInputSchema).optional().describe('Inputs to collect before running the prompt'),
    saveOutput: z
      .boolean()
      .optional()
      .describe('If true, save response to .ignore/{{branch}}/{{datetime}}-{{promptname}}.md'),
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

const BPMPromptSelectionSchema = z
  .object({
    fileStyle: z
      .nativeEnum(SelectionStyle)
      .optional()
      .describe('Selection style for file inputs: flat (all files listed) or interactive (navigate step by step)'),
    folderStyle: z
      .nativeEnum(SelectionStyle)
      .optional()
      .describe('Selection style for folder inputs: flat (all folders listed) or interactive (navigate step by step)'),
    includes: z.array(z.string()).optional().describe('Glob patterns to include (e.g. ["src/**/*", "**/*.ts"])'),
    excludes: z
      .array(z.string())
      .optional()
      .describe('Glob patterns to exclude (e.g. ["**/node_modules/**", "**/.git/**"])'),
  })
  .describe('Settings for file/folder selection in prompts');

const BPMSettingsSchema = z
  .object({
    promptSelection: BPMPromptSelectionSchema.optional().describe('File/folder selection settings for prompts'),
    aiProvider: z
      .nativeEnum(AIProvider)
      .optional()
      .describe('AI provider to use for prompts: claude, gemini, or cursor-agent'),
  })
  .describe('Global settings for BPM behavior');

export const BPMConfigSchema = z
  .object({
    $schema: z.string().optional().describe('JSON Schema reference'),
    settings: BPMSettingsSchema.optional().describe('Global settings'),
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
  showHidden: z.boolean().optional(),
  bpm: SourceStateSchema,
});

export const ConfigsStateSchema = z.object({
  isGrouped: z.boolean(),
});

export const ReplacementsStateSchema = z.object({
  isGrouped: z.boolean(),
});

export const BranchContextSchema = z.object({
  prLink: z.string().optional(),
  linearProject: z.string().optional(),
  linearIssue: z.string().optional(),
  objective: z.string().optional(),
  notes: z.string().optional(),
  todos: z.string().optional(),
});

export const BranchesStateSchema = z.record(z.string(), BranchContextSchema);

export const BPMStateSchema = z.object({
  debug: z.boolean().optional(),
  activeReplacements: z.array(z.string()).optional(),
  lastBranch: z.string().optional(),
  environment: z.string().optional(),
});

export const WorkspaceUIStateSchema = z.object({
  tasks: TasksStateSchema.optional(),
  tools: ToolsStateSchema.optional(),
  prompts: PromptsStateSchema.optional(),
  configs: ConfigsStateSchema.optional(),
  replacements: ReplacementsStateSchema.optional(),
  branches: BranchesStateSchema.optional(),
});

export type TaskSource = z.infer<typeof TaskSourceEnum>;
export type BPMScript = z.infer<typeof BPMScriptSchema>;
export type BPMTool = z.infer<typeof BPMToolSchema>;
export type BPMPromptInput = z.infer<typeof BPMPromptInputSchema>;
export type BPMPrompt = z.infer<typeof BPMPromptSchema>;
export type BPMConfigItem = z.infer<typeof BPMConfigItemSchema>;
export type BPMReplacement = z.infer<typeof BPMReplacementSchema>;
export type BPMPromptSelection = z.infer<typeof BPMPromptSelectionSchema>;
export type BPMSettings = z.infer<typeof BPMSettingsSchema>;
export type BPMConfig = z.infer<typeof BPMConfigSchema>;
export type SourceState = z.infer<typeof SourceStateSchema>;
export type TasksState = z.infer<typeof TasksStateSchema>;
export type ToolsState = z.infer<typeof ToolsStateSchema>;
export type PromptsState = z.infer<typeof PromptsStateSchema>;
export type ConfigsState = z.infer<typeof ConfigsStateSchema>;
export type ReplacementsState = z.infer<typeof ReplacementsStateSchema>;
export type BranchContext = z.infer<typeof BranchContextSchema>;
export type BranchesState = z.infer<typeof BranchesStateSchema>;
export type BPMState = z.infer<typeof BPMStateSchema>;
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

export const DEFAULT_CONFIGS_STATE: ConfigsState = {
  isGrouped: true,
};

export const DEFAULT_REPLACEMENTS_STATE: ReplacementsState = {
  isGrouped: true,
};

export const DEFAULT_WORKSPACE_UI_STATE: WorkspaceUIState = {
  tasks: DEFAULT_TASKS_STATE,
  tools: DEFAULT_TOOLS_STATE,
  prompts: DEFAULT_PROMPTS_STATE,
  configs: DEFAULT_CONFIGS_STATE,
  replacements: DEFAULT_REPLACEMENTS_STATE,
  branches: {},
};
