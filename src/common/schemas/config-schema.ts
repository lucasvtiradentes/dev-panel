import { z } from 'zod';
import {
  BRANCHES_DIR_NAME,
  CONFIG_DIR_NAME,
  DEFAULT_EXCLUDES,
  DEFAULT_INCLUDES,
  EXTENSION_DISPLAY_NAME,
  PROMPTS_DIR_NAME,
} from '../constants/scripts-constants';

export enum PromptInputType {
  File = 'file',
  Folder = 'folder',
  Text = 'text',
  Number = 'number',
  Confirm = 'confirm',
  Choice = 'choice',
  Multichoice = 'multichoice',
}

export enum AIProvider {
  Claude = 'claude',
  Gemini = 'gemini',
  CursorAgent = 'cursor-agent',
}

export enum PromptExecutionMode {
  Timestamped = 'timestamped',
  Overwrite = 'overwrite',
}

const PPInputSchema = z
  .object({
    name: z.string().describe('Variable name used in template as $name'),
    type: z.nativeEnum(PromptInputType).describe('Input type'),
    label: z.string().describe('Label shown in the input dialog'),
    placeholder: z.string().optional().describe('Placeholder text for text/number inputs'),
    options: z.array(z.string()).optional().describe('Available options for choice/multichoice types'),
    multiSelect: z.boolean().optional().describe('Enable multi-selection for file/folder types'),
    includes: z
      .array(z.string())
      .optional()
      .describe('Glob patterns to include for this input. Extends global includes'),
    excludes: z
      .array(z.string())
      .optional()
      .describe('Glob patterns to exclude for this input. Extends global excludes'),
  })
  .describe('An input required before execution (used by prompts and tasks)');

const PPTaskSchema = z
  .object({
    name: z.string().describe('Unique identifier for the task'),
    command: z.string().describe('Shell command to execute'),
    group: z.string().optional().describe('Group name for organizing tasks'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
    inputs: z.array(PPInputSchema).optional().describe('Inputs to collect before running the task'),
    useWorkspaceRoot: z
      .boolean()
      .optional()
      .describe('If true, run command from workspace root instead of .pp directory'),
  })
  .describe('A task that can be executed from the Tasks view');

const PPToolSchema = z
  .object({
    name: z.string().describe('Unique identifier for the tool'),
    command: z.string().optional().describe('Shell command to execute'),
    group: z.string().optional().describe('Group name for organizing tools'),
    useWorkspaceRoot: z
      .boolean()
      .optional()
      .describe('If true, run command from workspace root instead of .pp directory'),
  })
  .describe('A tool that can be executed from the Tools view');

const PPPromptSchema = z
  .object({
    name: z.string().describe('Unique identifier for the prompt'),
    file: z.string().describe(`Path to prompt file relative to ${CONFIG_DIR_NAME}/${PROMPTS_DIR_NAME}/`),
    group: z.string().optional().describe('Group name for organizing prompts'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
    inputs: z.array(PPInputSchema).optional().describe('Inputs to collect before running the prompt'),
    saveOutput: z
      .boolean()
      .optional()
      .describe(
        `If true, save response to ${CONFIG_DIR_NAME}/${BRANCHES_DIR_NAME}/{{branch}}/${PROMPTS_DIR_NAME}/{{promptname}}.md`,
      ),
    useWorkspaceRoot: z
      .boolean()
      .optional()
      .describe('If true, resolve file path from workspace root instead of .pp directory'),
  })
  .describe('A prompt that can be executed in Claude Code');

const PPVariableBaseSchema = z.object({
  name: z.string().describe('Unique identifier for the variable'),
  command: z.string().optional().describe('Shell command to execute when value changes'),
  description: z.string().optional().describe('Human-readable description'),
  group: z.string().optional().describe('Group name for organizing variables'),
});

const PPVariableChooseSingleSchema = PPVariableBaseSchema.extend({
  kind: z.literal('choose').describe('Choose from a list of options'),
  options: z.array(z.string()).describe('Available options'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  default: z.string().optional().describe('Default value'),
});

const PPVariableChooseMultiSchema = PPVariableBaseSchema.extend({
  kind: z.literal('choose').describe('Choose from a list of options (multi-select)'),
  options: z.array(z.string()).describe('Available options'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  default: z.array(z.string()).optional().describe('Default values'),
});

const PPVariableChooseSchema = z.union([PPVariableChooseSingleSchema, PPVariableChooseMultiSchema]);

const PPVariableToggleSchema = PPVariableBaseSchema.extend({
  kind: z.literal('toggle').describe('Toggle between ON/OFF'),
  default: z.boolean().optional().describe('Default value'),
});

const PPVariableInputSchema = PPVariableBaseSchema.extend({
  kind: z.literal('input').describe('Free text input'),
  default: z.string().optional().describe('Default value'),
});

const PPVariableFileSingleSchema = PPVariableBaseSchema.extend({
  kind: z.literal('file').describe('File selection'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. Extends global includes'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude. Extends global excludes'),
  default: z.string().optional().describe('Default value'),
});

const PPVariableFileMultiSchema = PPVariableBaseSchema.extend({
  kind: z.literal('file').describe('File selection (multi-select)'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. Extends global includes'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude. Extends global excludes'),
  default: z.array(z.string()).optional().describe('Default values'),
});

const PPVariableFileSchema = z.union([PPVariableFileSingleSchema, PPVariableFileMultiSchema]);

const PPVariableFolderSingleSchema = PPVariableBaseSchema.extend({
  kind: z.literal('folder').describe('Folder selection'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. Extends global includes'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude. Extends global excludes'),
  default: z.string().optional().describe('Default value'),
});

const PPVariableFolderMultiSchema = PPVariableBaseSchema.extend({
  kind: z.literal('folder').describe('Folder selection (multi-select)'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. Extends global includes'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude. Extends global excludes'),
  default: z.array(z.string()).optional().describe('Default values'),
});

const PPVariableFolderSchema = z.union([PPVariableFolderSingleSchema, PPVariableFolderMultiSchema]);

const PPVariableSchema = z
  .union([
    PPVariableChooseSingleSchema,
    PPVariableChooseMultiSchema,
    PPVariableToggleSchema,
    PPVariableInputSchema,
    PPVariableFileSingleSchema,
    PPVariableFileMultiSchema,
    PPVariableFolderSingleSchema,
    PPVariableFolderMultiSchema,
  ])
  .describe('A configuration variable shown in the Variables view');

const PPReplacementPatchSchema = z.object({
  search: z.string().describe('Text or pattern to search for'),
  replace: z.string().describe('Replacement text'),
});

const PPReplacementBaseSchema = z.object({
  name: z.string().describe('Unique identifier for the replacement'),
  description: z.string().optional().describe('Human-readable description'),
  group: z.string().optional().describe('Group name for organizing replacements'),
});

const PPReplacementFileSchema = PPReplacementBaseSchema.extend({
  type: z.literal('file').describe('Replace entire file content'),
  source: z.string().describe('Source file path relative to workspace'),
  target: z.string().describe('Target file path relative to workspace'),
});

const PPReplacementPatchTypeSchema = PPReplacementBaseSchema.extend({
  type: z.literal('patch').describe('Apply patches to file'),
  target: z.string().describe('Target file path relative to workspace'),
  patches: z.array(PPReplacementPatchSchema).describe('List of search/replace patches'),
});

const PPReplacementSchema = z
  .discriminatedUnion('type', [PPReplacementFileSchema, PPReplacementPatchTypeSchema])
  .describe('A file replacement/patch shown in the Replacements view');

const PPSettingsSchema = z
  .object({
    aiProvider: z
      .nativeEnum(AIProvider)
      .optional()
      .describe('AI provider to use for prompts: claude, gemini, or cursor-agent'),
    promptExecution: z
      .nativeEnum(PromptExecutionMode)
      .optional()
      .describe(
        'Execution mode for prompts with saveOutput: "timestamped" creates new file each time with timestamp, "overwrite" replaces previous file',
      ),
    include: z
      .array(z.string())
      .optional()
      .describe(
        `Glob patterns to include globally (package.json search, prompt file/folder selection, variable file/folder selection). Extends defaults: ${DEFAULT_INCLUDES.join(', ')}. Add custom inclusions as needed (e.g. ["**/*.ts", "**/*.json"])`,
      ),
    exclude: z
      .array(z.string())
      .optional()
      .describe(
        `Glob patterns to exclude globally (package.json search, prompt file/folder selection, variable file/folder selection). Extends defaults: ${DEFAULT_EXCLUDES.join(', ')}. Add custom exclusions as needed (e.g. ["**/.pp/**", "**/.changeset/**", "**/out/**", "**/*.log"])`,
      ),
  })
  .describe(`Global settings for ${EXTENSION_DISPLAY_NAME} behavior`);

const BranchContextSectionSchema = z.object({
  name: z.string().describe('Section heading name exactly as it appears in template (e.g., "TESTS SCENARIOS")'),
  type: z
    .enum(['field', 'text', 'auto'])
    .describe('Section type: field = inline value, text = multi-line, auto = auto-populated'),
  provider: z.string().optional().describe('Provider path for auto sections (e.g., "./plugins/github-pr.js")'),
  icon: z.string().optional().describe('VSCode icon name (optional, defaults to symbol-field)'),
  options: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom options passed to the provider (e.g., { includeReviewComments: true })'),
});

const BranchContextProviderSchema = z.object({
  provider: z
    .string()
    .describe('Command to execute (e.g., "node ./plugins/my-provider.js", "bash ./scripts/fetch.sh")'),
});

const BranchContextConfigSchema = z.object({
  changedFiles: z
    .union([z.boolean(), BranchContextProviderSchema])
    .optional()
    .describe('Changed files section: false = hide, true = default provider, { provider: string } = custom provider')
    .default(true),
  tasks: z
    .union([z.boolean(), BranchContextProviderSchema])
    .optional()
    .describe('Tasks section: false = hide, true = default provider, { provider: string } = custom provider')
    .default(true),
  sections: z
    .array(BranchContextSectionSchema)
    .optional()
    .describe('Custom sections to include in branch context')
    .default([]),
});

export const PPConfigSchema = z
  .object({
    $schema: z.string().optional().describe('JSON Schema reference'),
    settings: PPSettingsSchema.optional().describe('Global settings'),
    branchContext: BranchContextConfigSchema.optional().describe('Branch context configuration'),
    variables: z.array(PPVariableSchema).optional().describe('Configuration variables'),
    replacements: z.array(PPReplacementSchema).optional().describe('File replacements/patches'),
    tasks: z.array(PPTaskSchema).optional().describe('Executable tasks'),
    tools: z.array(PPToolSchema).optional().describe('Executable tools'),
    prompts: z.array(PPPromptSchema).optional().describe('Claude Code prompts'),
  })
  .describe(`${EXTENSION_DISPLAY_NAME} configuration file`);

export type PPInput = z.infer<typeof PPInputSchema>;
export type PPPromptInput = PPInput;
export type PPPrompt = z.infer<typeof PPPromptSchema>;
export type PPSettings = z.infer<typeof PPSettingsSchema>;
export type PPConfig = z.infer<typeof PPConfigSchema>;
export type PPTask = z.infer<typeof PPTaskSchema>;
export type PPTool = z.infer<typeof PPToolSchema>;
export type PPVariable = z.infer<typeof PPVariableSchema>;
export type PPReplacement = z.infer<typeof PPReplacementSchema>;
export type PPReplacementPatch = z.infer<typeof PPReplacementPatchSchema>;
export type BranchContextConfig = z.infer<typeof BranchContextConfigSchema>;
export type BranchContextSection = z.infer<typeof BranchContextSectionSchema>;
export type BranchContextProviderConfig = z.infer<typeof BranchContextProviderSchema>;
