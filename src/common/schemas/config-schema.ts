import { z } from 'zod';
import { CONFIG_DIR_NAME } from '../constants/scripts-constants';

export enum PromptInputType {
  File = 'file',
  Folder = 'folder',
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
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
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

const PPPromptSchema = z
  .object({
    name: z.string().describe('Unique identifier for the prompt'),
    file: z.string().describe(`Path to prompt file relative to ${CONFIG_DIR_NAME}/prompts/`),
    group: z.string().optional().describe('Group name for organizing prompts'),
    description: z.string().optional().describe('Human-readable description shown as tooltip'),
    inputs: z.array(PPPromptInputSchema).optional().describe('Inputs to collect before running the prompt'),
    saveOutput: z
      .boolean()
      .optional()
      .describe('If true, save response to .ignore/{{branch}}/{{datetime}}-{{promptname}}.md'),
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
    selectionStyle: z
      .nativeEnum(SelectionStyle)
      .optional()
      .describe('Selection style for file/folder kinds. Overrides global setting'),
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

const PPReplacementSchema = z
  .object({
    name: z.string().describe('Unique identifier for the replacement'),
    type: z.enum(['patch']).describe('Type of replacement'),
    description: z.string().optional().describe('Human-readable description'),
    target: z.string().describe('Target file path relative to workspace'),
    onBranchChange: z.enum(['revert', 'keep']).optional().describe('What to do when git branch changes'),
    patches: z.array(PPReplacementPatchSchema).describe('List of search/replace patches'),
    group: z.string().optional().describe('Group name for organizing replacements'),
  })
  .describe('A file replacement/patch shown in the Replacements view');

const PPPromptSelectionSchema = z
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

const PPSettingsSchema = z
  .object({
    promptSelection: PPPromptSelectionSchema.optional().describe('File/folder selection settings for prompts'),
    aiProvider: z
      .nativeEnum(AIProvider)
      .optional()
      .describe('AI provider to use for prompts: claude, gemini, or cursor-agent'),
    excludedDirs: z
      .array(z.string())
      .optional()
      .describe(
        `Additional directories to exclude when searching for package.json files. Always excluded (hardcoded): node_modules, dist, .git. Add custom exclusions as needed (e.g. ["dist-dev", "out", "${CONFIG_DIR_NAME}", "temp"])`,
      ),
  })
  .describe('Global settings for Project Panel behavior');

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
  .describe('Project Panel configuration file');

export type PPPromptInput = z.infer<typeof PPPromptInputSchema>;
export type PPPrompt = z.infer<typeof PPPromptSchema>;
export type PPSettings = z.infer<typeof PPSettingsSchema>;
export type PPConfig = z.infer<typeof PPConfigSchema>;
