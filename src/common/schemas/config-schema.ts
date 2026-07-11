import { z } from 'zod';
import { EXTENSION_DISPLAY_NAME } from '../constants/scripts-constants';

export enum InputType {
  Text = 'text',
  Number = 'number',
  Boolean = 'boolean',
  Choice = 'choice',
  File = 'file',
  Folder = 'folder',
}

const InputBaseShape = {
  name: z.string().describe('Input name'),
  label: z.string().optional().describe('Label shown in the input dialog'),
  description: z.string().optional().describe('Human-readable description'),
};

const TextInputShape = {
  ...InputBaseShape,
  type: z.literal(InputType.Text).describe('Free text input'),
  placeholder: z.string().optional().describe('Placeholder text'),
  default: z.string().optional().describe('Default value'),
};

const NumberInputShape = {
  ...InputBaseShape,
  type: z.literal(InputType.Number).describe('Numeric input'),
  placeholder: z.string().optional().describe('Placeholder text'),
  default: z.number().optional().describe('Default value'),
};

const BooleanInputShape = {
  ...InputBaseShape,
  type: z.literal(InputType.Boolean).describe('Boolean input'),
  default: z.boolean().optional().describe('Default value'),
};

const ChoiceInputSingleShape = {
  ...InputBaseShape,
  type: z.literal(InputType.Choice).describe('Choose one option'),
  options: z.array(z.string()).min(1).describe('Available options'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  default: z.string().optional().describe('Default value'),
};

const ChoiceInputMultiShape = {
  ...InputBaseShape,
  type: z.literal(InputType.Choice).describe('Choose multiple options'),
  options: z.array(z.string()).min(1).describe('Available options'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  default: z.array(z.string()).optional().describe('Default values'),
};

const FileInputSingleShape = {
  ...InputBaseShape,
  type: z.literal(InputType.File).describe('File selection'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude'),
  default: z.string().optional().describe('Default value'),
};

const FileInputMultiShape = {
  ...InputBaseShape,
  type: z.literal(InputType.File).describe('Multiple file selection'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude'),
  default: z.array(z.string()).optional().describe('Default values'),
};

const FolderInputSingleShape = {
  ...InputBaseShape,
  type: z.literal(InputType.Folder).describe('Folder selection'),
  multiSelect: z.literal(false).optional().describe('Single selection'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude'),
  default: z.string().optional().describe('Default value'),
};

const FolderInputMultiShape = {
  ...InputBaseShape,
  type: z.literal(InputType.Folder).describe('Multiple folder selection'),
  multiSelect: z.literal(true).describe('Multi-selection enabled'),
  includes: z.array(z.string()).optional().describe('Glob patterns to include'),
  excludes: z.array(z.string()).optional().describe('Glob patterns to exclude'),
  default: z.array(z.string()).optional().describe('Default values'),
};

const createInputSchemas = <T extends z.ZodRawShape>(extraShape: T) =>
  [
    z.object({ ...TextInputShape, ...extraShape }).strict(),
    z.object({ ...NumberInputShape, ...extraShape }).strict(),
    z.object({ ...BooleanInputShape, ...extraShape }).strict(),
    z.object({ ...ChoiceInputSingleShape, ...extraShape }).strict(),
    z.object({ ...ChoiceInputMultiShape, ...extraShape }).strict(),
    z.object({ ...FileInputSingleShape, ...extraShape }).strict(),
    z.object({ ...FileInputMultiShape, ...extraShape }).strict(),
    z.object({ ...FolderInputSingleShape, ...extraShape }).strict(),
    z.object({ ...FolderInputMultiShape, ...extraShape }).strict(),
  ] as const;

const DevPanelInputSchema = z.union(createInputSchemas({})).describe('An input collected before task execution');

const DevPanelTaskSchema = z
  .object({
    name: z.string().describe('Unique identifier for the task'),
    command: z.string().describe('Shell command to execute'),
    group: z.string().optional().describe('Group name for organizing tasks'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
    inputs: z.array(DevPanelInputSchema).optional().describe('Inputs to collect before running the task'),
    hideTerminal: z
      .boolean()
      .optional()
      .describe('If true, run command silently with progress notification instead of showing terminal'),
  })
  .strict()
  .describe('A task that can be executed from the Tasks view');

const VariableMetadataShape = {
  command: z.string().optional().describe('Shell command to execute when value changes'),
  group: z.string().optional().describe('Group name for organizing variables'),
};

const DevPanelVariableSchema = z
  .union(createInputSchemas(VariableMetadataShape))
  .describe('A persistent input shown in the Variables view');

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
  source: z.string().describe('Source file path relative to workspace, or absolute path'),
  target: z.string().describe('Target file path relative to workspace, or absolute path'),
});

const DevPanelReplacementPatchTypeSchema = DevPanelReplacementBaseSchema.extend({
  type: z.literal(ReplacementType.Patch).describe('Apply patches to file'),
  target: z.string().describe('Target file path relative to workspace, or absolute path'),
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
