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
    excludedDirs: z
      .array(z.string())
      .optional()
      .describe(
        'Additional directories to exclude when searching for package.json files. Always excluded (hardcoded): node_modules, dist, .git. Add custom exclusions as needed (e.g. ["dist-dev", "out", ".bpm", "temp"])',
      ),
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

export type BPMPromptInput = z.infer<typeof BPMPromptInputSchema>;
export type BPMPrompt = z.infer<typeof BPMPromptSchema>;
export type BPMSettings = z.infer<typeof BPMSettingsSchema>;
export type BPMConfig = z.infer<typeof BPMConfigSchema>;
