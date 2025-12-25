import { homedir } from 'node:os';
import * as path from 'node:path';
import { TOOLS_DIR } from './constants';

export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'project-panel';
export const EXTENSION_DISPLAY_NAME = 'Project Panel';

export const CONFIG_DIR_KEY = 'pp'; // Key used in workspace state objects (without the dot)
export const CONFIG_DIR_NAME = `.${CONFIG_DIR_KEY}`;
export const DISPLAY_PREFIX = 'Project Panel:';
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
export const CONFIG_SCHEMA_PATH = '../resources/schema.json';
export const DEFAULT_AI_PROVIDER = 'claude';

export const BRANCH_CONTEXT_NA = 'N/A';
export const BRANCH_CONTEXT_NO_CHANGES = 'No changes';
export const BRANCH_CONTEXT_DEFAULT_TODOS = '- [ ] task1\n- [ ] task2';

export const METADATA_PP_PREFIX = '<!-- PP_METADATA: ';
export const METADATA_SECTION_PREFIX = '<!-- SECTION_METADATA: ';
export const METADATA_SUFFIX = ' -->';
export const METADATA_SEPARATOR = '<!-- ------------------- -->';
export const METADATA_PP_REGEX = /<!--\s*PP_METADATA:.*?-->/;
export const METADATA_SEPARATOR_REGEX = /<!--\s*-+\s*-->/;

export const METADATA_FIELD_IS_EMPTY = 'isEmpty';
export const METADATA_FIELD_DESCRIPTION = 'description';

export const DND_MIME_TYPE_TASKS = 'application/vnd.code.tree.projectpaneltasks';
export const DND_MIME_TYPE_PROMPTS = 'application/vnd.code.tree.projectpanelprompts';
export const DND_MIME_TYPE_TOOLS = 'application/vnd.code.tree.projectpaneltools';

export const WORKSPACE_STATE_KEY = 'pp.uiState';

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

export const CONTEXT_PREFIX = 'projectPanel';
export const VIEW_ID_TASKS = 'projectPanelTasks';
export const VIEW_ID_CONFIGS = 'projectPanelConfigs';
export const VIEW_ID_REPLACEMENTS = 'projectPanelReplacements';
export const VIEW_ID_TOOLS = 'projectPanelTools';
export const VIEW_ID_PROMPTS = 'projectPanelPrompts';
export const VIEW_ID_BRANCH_CONTEXT = 'projectPanelBranchContext';
export const VIEW_ID_TODOS = 'projectPanelTodos';
export const DEV_SUFFIX = 'dev';
export const LOG_BASENAME = 'project-panel';
export const TOOL_COMMAND_SUFFIX = 'tool';
export const TOOL_TASK_TYPE = 'projectPanel-tool';
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

export const AI_SPEC_PROJECT_TOOLS_REGEX = /<project_tools>[\s\S]*?<\/project_tools>/;
export const AI_SPEC_AVAILABLE_TOOLS_REGEX = /<available_tools>[\s\S]*?<\/available_tools>/;

export const WORKSPACE_STATE_CONFIG_DIR_KEY = 'pp.configDir';

export const ERROR_MSG_WORKSPACE_REQUIRED = 'File/folder input requires a workspace folder';
export const ERROR_MSG_INVALID_NUMBER = 'Please enter a valid number';

export const CONFIRM_YES = 'Yes';
export const CONFIRM_NO = 'No';
export const CONFIRM_OPTIONS = [CONFIRM_YES, CONFIRM_NO] as const;

export const GLOBAL_ITEM_TOOLTIP_SUFFIX = 'from ~/.pp/config.jsonc';
export const GLOBAL_PROMPT_TOOLTIP = `Global prompt ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;
export const GLOBAL_TASK_TOOLTIP = `Global task ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;
export const GLOBAL_TOOL_TOOLTIP = `Global tool ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;

export const NOT_GIT_REPO_MESSAGE = 'Not a git repository';
export const EMPTY_TASKS_MESSAGE = 'Click to add tasks';
export const NO_PENDING_TASKS_MESSAGE = 'No pending tasks';

export const ERROR_REPLACEMENTS_REQUIRE_GIT = 'Replacements require a git repository';
export const ERROR_TARGET_FILE_NOT_FOUND = 'Target file not found';
export const ERROR_SOURCE_FILE_NOT_FOUND = 'Source file not found';
export const ERROR_VARIABLE_COMMAND_FAILED = 'Variable command failed';

export const NPM_RUN_COMMAND = 'npm run';
