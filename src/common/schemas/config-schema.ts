import { z } from 'zod';
import {
  BRANCHES_DIR_NAME,
  CONFIG_DIR_NAME,
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

const PPTaskSchema = z
  .object({
    name: z.string().describe('Unique identifier for the task'),
    command: z.string().describe('Shell command to execute'),
    group: z.string().optional().describe('Group name for organizing tasks'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
  })
  .describe('A task that can be executed from the Tasks view');

const PPToolSchema = z
  .object({
    name: z.string().describe('Unique identifier for the tool'),
    command: z.string().describe('Shell command to execute'),
    group: z.string().optional().describe('Group name for organizing tools'),
  })
  .describe('A tool that can be executed from the Tools view');

const PPPromptInputSchema = z
  .object({
    name: z.string().describe('Variable name used in prompt template as {{name}}'),
    type: z.nativeEnum(PromptInputType).describe('Input type'),
    label: z.string().describe('Label shown in the input dialog'),
    placeholder: z.string().optional().describe('Placeholder text for text/number inputs'),
    options: z.array(z.string()).optional().describe('Available options for choice/multichoice types'),
    multiSelect: z.boolean().optional().describe('Enable multi-selection for file/folder types'),
    excludes: z
      .array(z.string())
      .optional()
      .describe('Glob patterns to exclude for this input. Overrides global excludes'),
  })
  .describe('An input required before running the prompt');

const PPPromptSchema = z
  .object({
    name: z.string().describe('Unique identifier for the prompt'),
    file: z.string().describe(`Path to prompt file relative to ${CONFIG_DIR_NAME}/${PROMPTS_DIR_NAME}/`),
    group: z.string().optional().describe('Group name for organizing prompts'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
    inputs: z.array(PPPromptInputSchema).optional().describe('Inputs to collect before running the prompt'),
    saveOutput: z
      .boolean()
      .optional()
      .describe(
        `If true, save response to ${CONFIG_DIR_NAME}/${BRANCHES_DIR_NAME}/{{branch}}/${PROMPTS_DIR_NAME}/{{promptname}}.md`,
      ),
  })
  .describe('A prompt that can be executed in Claude Code');

const PPVariableSchema = z
  .object({
    name: z.string().describe('Unique identifier for the variable'),
    kind: z.enum(['choose', 'toggle', 'input', 'multi-select', 'file', 'folder']).describe('Type of variable input'),
    options: z.array(z.string()).optional().describe('Available options for choose/multi-select kinds'),
    command: z.string().optional().describe('Shell command to execute when value changes'),
    description: z.string().optional().describe('Human-readable description'),
    default: z
      .union([z.string(), z.boolean(), z.array(z.string())])
      .optional()
      .describe('Default value'),
    group: z.string().optional().describe('Group name for organizing variables'),
    multiSelect: z.boolean().optional().describe('Enable multi-selection for file/folder kinds'),
    excludes: z
      .array(z.string())
      .optional()
      .describe('Glob patterns to exclude for file/folder kinds. Overrides global excludes'),
  })
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
    exclude: z
      .array(z.string())
      .optional()
      .describe(
        `Glob patterns to exclude globally (package.json search, prompt file/folder selection, variable file/folder selection). Always excluded (hardcoded): node_modules, dist, .git. Add custom exclusions as needed (e.g. ["**/.pp/**", "**/.changeset/**", "**/out/**", "**/*.log"])`,
      ),
  })
  .describe(`Global settings for ${EXTENSION_DISPLAY_NAME} behavior`);

export const PPConfigSchema = z
  .object({
    $schema: z.string().optional().describe('JSON Schema reference'),
    settings: PPSettingsSchema.optional().describe('Global settings'),
    variables: z.array(PPVariableSchema).optional().describe('Configuration variables'),
    replacements: z.array(PPReplacementSchema).optional().describe('File replacements/patches'),
    tasks: z.array(PPTaskSchema).optional().describe('Executable tasks'),
    tools: z.array(PPToolSchema).optional().describe('Executable tools'),
    prompts: z.array(PPPromptSchema).optional().describe('Claude Code prompts'),
  })
  .describe(`${EXTENSION_DISPLAY_NAME} configuration file`);

export type PPPromptInput = z.infer<typeof PPPromptInputSchema>;
export type PPPrompt = z.infer<typeof PPPromptSchema>;
export type PPSettings = z.infer<typeof PPSettingsSchema>;
export type PPConfig = z.infer<typeof PPConfigSchema>;
export type PPTask = z.infer<typeof PPTaskSchema>;
export type PPTool = z.infer<typeof PPToolSchema>;
export type PPVariable = z.infer<typeof PPVariableSchema>;
export type PPReplacement = z.infer<typeof PPReplacementSchema>;
export type PPReplacementPatch = z.infer<typeof PPReplacementPatchSchema>;
