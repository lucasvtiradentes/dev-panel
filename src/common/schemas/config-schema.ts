import { z } from 'zod';
import { CONFIG_DIR_NAME, EXTENSION_DISPLAY_NAME } from '../constants/scripts-constants';

export enum InputType {
  File = 'file',
  Folder = 'folder',
  Text = 'text',
  Number = 'number',
  Confirm = 'confirm',
  Choice = 'choice',
  Multichoice = 'multichoice',
}

const DevPanelInputSchema = z
  .object({
    name: z.string().describe('Variable name used in template as $name'),
    type: z.enum(InputType).describe('Input type'),
    label: z.string().describe('Label shown in the input dialog'),
    placeholder: z.string().optional().describe('Placeholder text for text/number inputs'),
    options: z.array(z.string()).optional().describe('Available options for choice/multichoice types'),
    multiSelect: z.boolean().optional().describe('Enable multi-selection for file/folder types'),
    includes: z
      .array(z.string())
      .optional()
      .describe('Glob patterns to include for this input. If not specified, all files are shown'),
    excludes: z.array(z.string()).optional().describe('Glob patterns to exclude for this input'),
  })
  .describe('An input required before execution (used by tasks)');

const DevPanelTaskSchema = z
  .object({
    name: z.string().describe('Unique identifier for the task'),
    command: z.string().describe('Shell command to execute'),
    group: z.string().optional().describe('Group name for organizing tasks'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
    inputs: z.array(DevPanelInputSchema).optional().describe('Inputs to collect before running the task'),
    useConfigDir: z
      .boolean()
      .optional()
      .describe(`If true, run command from ${CONFIG_DIR_NAME} directory instead of workspace root`),
    hideTerminal: z
      .boolean()
      .optional()
      .describe('If true, run command silently with progress notification instead of showing terminal'),
  })
  .describe('A task that can be executed from the Tasks view');

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
  includes: z.array(z.string()).optional().describe('Glob patterns to include. If not specified, all files are shown'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude'),
  default: z.string().optional().describe('Default value'),
});

const DevPanelVariableFileMultiSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('file').describe('File selection (multi-select)'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. If not specified, all files are shown'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude'),
  default: z.array(z.string()).optional().describe('Default values'),
});

const DevPanelVariableFolderSingleSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('folder').describe('Folder selection'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. If not specified, all files are shown'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude'),
  default: z.string().optional().describe('Default value'),
});

const DevPanelVariableFolderMultiSchema = DevPanelVariableBaseSchema.extend({
  kind: z.literal('folder').describe('Folder selection (multi-select)'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include. If not specified, all files are shown'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude'),
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

export const DevPanelConfigSchema = z
  .object({
    $schema: z.string().optional().describe('JSON Schema reference'),
    variables: z.array(DevPanelVariableSchema).optional().describe('Configuration variables'),
    replacements: z.array(DevPanelReplacementSchema).optional().describe('File replacements/patches'),
    tasks: z.array(DevPanelTaskSchema).optional().describe('Executable tasks'),
    taskScanIgnorePaths: z
      .array(z.string())
      .optional()
      .describe('Directory names to ignore when scanning for task source files (package.json, Makefile)'),
  })
  .describe(`${EXTENSION_DISPLAY_NAME} configuration file`);

export type DevPanelInput = z.infer<typeof DevPanelInputSchema>;
export type DevPanelConfig = z.infer<typeof DevPanelConfigSchema>;
export type DevPanelVariable = z.infer<typeof DevPanelVariableSchema>;
export type DevPanelReplacement = z.infer<typeof DevPanelReplacementSchema>;
