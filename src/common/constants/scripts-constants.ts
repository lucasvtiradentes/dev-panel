import { homedir } from 'node:os';
import * as path from 'node:path';

export const TOOLS_DIR = 'tools';
export const TOOL_INSTRUCTIONS_FILE = 'instructions.md';

export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'dev-panel';
export const EXTENSION_DISPLAY_NAME = 'Dev Panel';

export const CONFIG_DIR_KEY = 'devpanel';
export const CONFIG_DIR_NAME = `.${CONFIG_DIR_KEY}`;
export const CONFIG_FILE_NAME = 'config.jsonc';
export const VARIABLES_FILE_NAME = 'variables.json';
export const BRANCHES_DIR_NAME = 'branches';
export const PROMPTS_DIR_NAME = 'prompts';
export const RESOURCES_DIR_NAME = 'resources';
export const INIT_RESOURCES_DIR_NAME = 'init';
export const BRANCH_CONTEXT_FILENAME = 'branch-context.md';
export const BRANCH_CONTEXT_TEMPLATE_FILENAME = 'branch-context-template.md';
export const CLAUDE_DIR_NAME = '.claude';
export const SKILLS_DIR_NAME = 'skills';
export const SKILL_FILE_NAME = 'SKILL.md';
export const ROOT_BRANCH_CONTEXT_FILE_NAME = '.branch-context.md';
export const DEFAULT_INCLUDES = ['**/*'];
export const DEFAULT_EXCLUDES = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**'];
export const DEFAULT_EXCLUDED_DIRS = ['node_modules', 'dist', '.git'];

export const BRANCH_CONTEXT_NA = 'N/A';
export const BRANCH_CONTEXT_NO_CHANGES = 'No changes';
export const BRANCH_CONTEXT_DEFAULT_TODOS = '- [ ] task1\n- [ ] task2';

export const METADATA_DEVPANEL_PREFIX = '<!-- DEVPANEL_METADATA: ';
export const METADATA_SECTION_PREFIX = '<!-- SECTION_METADATA: ';
export const METADATA_SUFFIX = ' -->';
export const METADATA_SEPARATOR = '<!-- ------------------- -->';
export const METADATA_DEVPANEL_REGEX = /<!--\s*DEVPANEL_METADATA:.*?-->/;
export const METADATA_SEPARATOR_REGEX = /<!--\s*-+\s*-->/;

export const METADATA_FIELD_IS_EMPTY = 'isEmpty';
export const METADATA_FIELD_DESCRIPTION = 'description';

export const DND_MIME_TYPE_TASKS = `application/vnd.code.tree.${CONFIG_DIR_KEY}tasks`;
export const DND_MIME_TYPE_PROMPTS = `application/vnd.code.tree.${CONFIG_DIR_KEY}prompts`;
export const DND_MIME_TYPE_TOOLS = `application/vnd.code.tree.${CONFIG_DIR_KEY}tools`;
export const DND_MIME_TYPE_BRANCH_TASKS = `application/vnd.code.tree.${CONFIG_DIR_KEY}branchtasks`;

export const WORKSPACE_STATE_KEY = `${CONFIG_DIR_KEY}.uiState`;

export const LOCAL_DIST_DIR = 'dist-dev';

export const VSCODE_STANDARD_CONTAINERS = ['explorer', 'scm', 'debug', 'test', 'remote'];

export const EDITOR_EXTENSIONS_PATHS = {
  vscode: '.vscode/extensions',
  cursor: '.cursor/extensions',
  windsurf: '.windsurf/extensions',
  vscodium: {
    darwin: '.vscode-oss/extensions',
    linux: '.config/VSCodium/extensions',
  },
} as const;

export const CONTEXT_PREFIX = 'devPanel';
export const VIEW_ID_TASKS = `${CONTEXT_PREFIX}Tasks`;
export const VIEW_ID_CONFIGS = `${CONTEXT_PREFIX}Configs`;
export const VIEW_ID_REPLACEMENTS = `${CONTEXT_PREFIX}Replacements`;
export const VIEW_ID_TOOLS = `${CONTEXT_PREFIX}Tools`;
export const VIEW_ID_PROMPTS = `${CONTEXT_PREFIX}Prompts`;
export const VIEW_ID_BRANCH_CONTEXT = `${CONTEXT_PREFIX}BranchContext`;
export const VIEW_ID_TODOS = `${CONTEXT_PREFIX}Todos`;
export const DEV_SUFFIX = 'dev';
const LOG_BASENAME = EXTENSION_NAME;
export const TOOL_COMMAND_SUFFIX = 'tool';
export const TOOL_TASK_TYPE = `${CONTEXT_PREFIX}-tool`;
export const GLOBAL_TASK_TYPE = `${CONFIG_DIR_KEY}-global`;
export const PROMPT_COMMAND_SUFFIX = 'prompt';
export const REPLACEMENT_COMMAND_SUFFIX = 'replacement';
export const VARIABLE_COMMAND_SUFFIX = 'variable';
export const TASK_COMMAND_SUFFIX = 'task';
export const NO_GROUP_NAME = 'no-group';

export function addDevSuffix(str: string): string {
  return `${str}${DEV_SUFFIX}`;
}

export function addDevLabel(str: string): string {
  return `${str} (${DEV_SUFFIX})`;
}

export function buildExtensionId(isDev: boolean): string {
  const name = isDev ? `${EXTENSION_NAME}-${DEV_SUFFIX}` : EXTENSION_NAME;
  return `${EXTENSION_PUBLISHER}.${name}`;
}

export function buildLogFilename(isDev: boolean): string {
  return isDev ? `${LOG_BASENAME}-${DEV_SUFFIX}.log` : `${LOG_BASENAME}.log`;
}

export function getGlobalConfigDir(): string {
  return path.join(homedir(), CONFIG_DIR_NAME);
}

export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), CONFIG_FILE_NAME);
}

export function getGlobalToolsDir(): string {
  return path.join(getGlobalConfigDir(), TOOLS_DIR);
}

export function getGlobalPromptsDir(): string {
  return path.join(getGlobalConfigDir(), PROMPTS_DIR_NAME);
}

export function getGlobalToolInstructionsPath(toolName: string): string {
  return path.join(getGlobalToolsDir(), toolName, TOOL_INSTRUCTIONS_FILE);
}

export function getSkillDir(workspacePath: string, skillName: string): string {
  return path.join(workspacePath, CLAUDE_DIR_NAME, SKILLS_DIR_NAME, skillName);
}

export function getSkillFilePath(workspacePath: string, skillName: string): string {
  return path.join(getSkillDir(workspacePath, skillName), SKILL_FILE_NAME);
}

export function getGlobalToolDir(toolName: string): string {
  return path.join(getGlobalToolsDir(), toolName);
}

export function getGlobalPromptFilePath(promptFile: string): string {
  return path.join(getGlobalPromptsDir(), promptFile);
}

export function getVscodeTasksFilePath(workspacePath: string): string {
  return path.join(workspacePath, '.vscode', 'tasks.json');
}

export const AI_SPEC_DEV_TOOLS_REGEX = /<dev_tools>[\s\S]*?<\/dev_tools>/;

export const REGISTRY_BASE_URL = 'https://raw.githubusercontent.com/lucasvtiradentes/dev-panel/main/registry';
export const REGISTRY_INDEX_FILE = 'index.json';
export const PLUGINS_DIR_NAME = 'plugins';
export const SCRIPTS_DIR_NAME = 'scripts';

export const REGISTRY_DEFAULT_PLUGIN_FILE = 'plugin.ts';
export const REGISTRY_DEFAULT_PROMPT_FILE = 'prompt.md';
export const REGISTRY_DEFAULT_TOOL_FILE = 'instructions.md';
export const REGISTRY_DEFAULT_SCRIPT_FILE = 'script.sh';
export const AI_SPEC_AVAILABLE_TOOLS_REGEX = /<available_tools>[\s\S]*?<\/available_tools>/;

export const WORKSPACE_STATE_CONFIG_DIR_KEY = `${CONFIG_DIR_KEY}.configDir`;

export const ERROR_MSG_WORKSPACE_REQUIRED = 'File/folder input requires a workspace folder';
export const ERROR_MSG_INVALID_NUMBER = 'Please enter a valid number';

export const CONFIRM_YES = 'Yes';
export const CONFIRM_NO = 'No';
export const CONFIRM_OPTIONS = [CONFIRM_YES, CONFIRM_NO] as const;

export const GLOBAL_ITEM_TOOLTIP_SUFFIX = `from ~/.devpanel/${CONFIG_FILE_NAME}`;
export const GLOBAL_PROMPT_TOOLTIP = `Global prompt ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;
export const GLOBAL_TASK_TOOLTIP = `Global task ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;
export const GLOBAL_TOOL_TOOLTIP = `Global tool ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;

export const NOT_GIT_REPO_MESSAGE = 'Not a git repository';

export const ERROR_REPLACEMENTS_REQUIRE_GIT = 'Replacements require a git repository';
export const ERROR_TARGET_FILE_NOT_FOUND = 'Target file not found';
export const ERROR_SOURCE_FILE_NOT_FOUND = 'Source file not found';
export const ERROR_VARIABLE_COMMAND_FAILED = 'Variable command failed';

export const NPM_RUN_COMMAND = 'npm run';
