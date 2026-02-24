import { z } from 'zod';
import {
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
  Overwrite = 'overwrite',
}

const DevPanelInputSchema = z
  .object({
    name: z.string().describe('Variable name used in template as $name'),
    type: z.enum(PromptInputType).describe('Input type'),
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

const DevPanelTaskSchema = z
  .object({
    name: z.string().describe('Unique identifier for the task'),
    command: z.string().describe('Shell command to execute'),
    group: z.string().optional().describe('Group name for organizing tasks'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
    inputs: z.array(DevPanelInputSchema).optional().describe('Inputs to collect before running the task'),
    useWorkspaceRoot: z
      .boolean()
      .optional()
      .describe(`If true, run command from workspace root instead of ${CONFIG_DIR_NAME} directory`),
    hideTerminal: z
      .boolean()
      .optional()
      .describe('If true, run command silently with progress notification instead of showing terminal'),
  })
  .describe('A task that can be executed from the Tasks view');

const DevPanelToolSchema = z
  .object({
    name: z.string().describe('Unique identifier for the tool'),
    command: z.string().optional().describe('Shell command to execute'),
    group: z.string().optional().describe('Group name for organizing tools'),
    useWorkspaceRoot: z
      .boolean()
      .optional()
      .describe(`If true, run command from workspace root instead of ${CONFIG_DIR_NAME} directory`),
  })
  .describe('A tool that can be executed from the Tools view');

const DevPanelPromptSchema = z
  .object({
    name: z.string().describe('Unique identifier for the prompt'),
    file: z.string().describe(`Path to prompt file relative to ${CONFIG_DIR_NAME}/${PROMPTS_DIR_NAME}/`),
    group: z.string().optional().describe('Group name for organizing prompts'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
    inputs: z.array(DevPanelInputSchema).optional().describe('Inputs to collect before running the prompt'),
    saveOutput: z.boolean().optional().describe('If true, save response to file'),
    useWorkspaceRoot: z
      .boolean()
      .optional()
      .describe(`If true, resolve file path from workspace root instead of ${CONFIG_DIR_NAME} directory`),
  })
  .describe('A prompt that can be executed in Claude Code');

export enum VariableKind {
  Choose = 'choose',
  Input = 'input',
  Toggle = 'toggle',
  File = 'file',
  Folder = 'folder',
}

const DevPanelVariableBaseSchema = z.object({
  name: z.string().describe('Unique identifier for the variable'),
  command: z.string().optional().describe('Shell command to execute when value changes'),
  description: z.string().optional().describe('Human-readable description'),
  group: z.string().optional().describe('Group name for organizing variables'),
});

const DevPanelVariableChooseSingleSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('choose').describe('Choose from a list of options'),
  options: z.array(z.string()).describe('Available options'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  default: z.string().optional().describe('Default value'),
});

const DevPanelVariableChooseMultiSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('choose').describe('Choose from a list of options (multi-select)'),
  options: z.array(z.string()).describe('Available options'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  default: z.array(z.string()).optional().describe('Default values'),
});

const DevPanelVariableToggleSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('toggle').describe('Toggle between ON/OFF'),
  default: z.boolean().optional().describe('Default value'),
});

const DevPanelVariableInputSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('input').describe('Free text input'),
  default: z.string().optional().describe('Default value'),
});

const DevPanelVariableFileSingleSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('file').describe('File selection'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. Extends global includes'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude. Extends global excludes'),
  default: z.string().optional().describe('Default value'),
});

const DevPanelVariableFileMultiSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('file').describe('File selection (multi-select)'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. Extends global includes'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude. Extends global excludes'),
  default: z.array(z.string()).optional().describe('Default values'),
});

const DevPanelVariableFolderSingleSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('folder').describe('Folder selection'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. Extends global includes'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude. Extends global excludes'),
  default: z.string().optional().describe('Default value'),
});

const DevPanelVariableFolderMultiSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('folder').describe('Folder selection (multi-select)'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. Extends global includes'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude. Extends global excludes'),
  default: z.array(z.string()).optional().describe('Default values'),
});

const DevPanelVariableSchema = z
  .union([
    DevPanelVariableChooseSingleSchema,
    DevPanelVariableChooseMultiSchema,
    DevPanelVariableToggleSchema,
    DevPanelVariableInputSchema,
    DevPanelVariableFileSingleSchema,
    DevPanelVariableFileMultiSchema,
    DevPanelVariableFolderSingleSchema,
    DevPanelVariableFolderMultiSchema,
  ])
  .describe('A configuration variable shown in the Variables view');

const DevPanelReplacementPatchSchema = z.object({
  search: z.string().describe('Text or pattern to search for'),
  replace: z.string().describe('Replacement text'),
});

const DevPanelReplacementBaseSchema = z.object({
  name: z.string().describe('Unique identifier for the replacement'),
  description: z.string().optional().describe('Human-readable description'),
  group: z.string().optional().describe('Group name for organizing replacements'),
});

export enum ReplacementType {
  File = 'file',
  Patch = 'patch',
}

const DevPanelReplacementFileSchema = DevPanelReplacementBaseSchema.extend({
  type: z.literal(ReplacementType.File).describe('Replace entire file content'),
  source: z.string().describe('Source file path relative to workspace'),
  target: z.string().describe('Target file path relative to workspace'),
});

const DevPanelReplacementPatchTypeSchema = DevPanelReplacementBaseSchema.extend({
  type: z.literal(ReplacementType.Patch).describe('Apply patches to file'),
  target: z.string().describe('Target file path relative to workspace'),
  patches: z.array(DevPanelReplacementPatchSchema).describe('List of search/replace patches'),
});

const DevPanelReplacementSchema = z
  .discriminatedUnion('type', [DevPanelReplacementFileSchema, DevPanelReplacementPatchTypeSchema])
  .describe('A file replacement/patch shown in the Replacements view');

const DevPanelSettingsSchema = z
  .object({
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
        `Glob patterns to exclude globally (package.json search, prompt file/folder selection, variable file/folder selection). Extends defaults: ${DEFAULT_EXCLUDES.join(', ')}. Add custom exclusions as needed (e.g. ["**/${CONFIG_DIR_NAME}/**", "**/.changeset/**", "**/out/**", "**/*.log"])`,
      ),
  })
  .describe(`Global settings for ${EXTENSION_DISPLAY_NAME} behavior`);

export const DevPanelConfigSchema = z
  .object({
    $schema: z.string().optional().describe('JSON Schema reference'),
    settings: DevPanelSettingsSchema.optional().describe('Global settings'),
    variables: z.array(DevPanelVariableSchema).optional().describe('Configuration variables'),
    replacements: z.array(DevPanelReplacementSchema).optional().describe('File replacements/patches'),
    tasks: z.array(DevPanelTaskSchema).optional().describe('Executable tasks'),
    tools: z.array(DevPanelToolSchema).optional().describe('Executable tools'),
    prompts: z.array(DevPanelPromptSchema).optional().describe('Claude Code prompts'),
  })
  .describe(`${EXTENSION_DISPLAY_NAME} configuration file`);

export type DevPanelInput = z.infer<typeof DevPanelInputSchema>;
export type DevPanelPrompt = z.infer<typeof DevPanelPromptSchema>;
export type DevPanelSettings = z.infer<typeof DevPanelSettingsSchema>;
export type DevPanelConfig = z.infer<typeof DevPanelConfigSchema>;
export type DevPanelVariable = z.infer<typeof DevPanelVariableSchema>;
export type DevPanelReplacement = z.infer<typeof DevPanelReplacementSchema>;
