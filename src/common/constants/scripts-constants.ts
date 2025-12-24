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
export const BRANCH_CONTEXT_DEFAULT_TODOS = '- [ ] task1\n- [ ] task2';

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

export function sanitizeBranchName(branchName: string): string {
  return branchName.replace(/[\/\\:*?"<>|]/g, '_');
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
