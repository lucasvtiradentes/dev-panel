import * as path from 'node:path';

export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'project-panel';
export const EXTENSION_DISPLAY_NAME = 'Project Panel';

export const CONFIG_DIR_NAME = '.pp';
export const CONFIG_DIR_KEY = 'pp'; // Key used in workspace state objects (without the dot)
export const DISPLAY_PREFIX = 'Project Panel:';
export const CONFIG_FILE_NAME = 'config.jsonc';
export const VARIABLES_FILE_NAME = 'variables.json';
export const BRANCHES_DIR_NAME = 'branches';
export const BRANCH_CONTEXT_FILENAME = 'branch-context.md';
export const BRANCH_CONTEXT_GLOB_PATTERN = `${CONFIG_DIR_NAME}/${BRANCHES_DIR_NAME}/*/${BRANCH_CONTEXT_FILENAME}`;
export const DEFAULT_EXCLUDES = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**'];

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

export function getBranchDirectory(workspace: string, branchName: string): string {
  const sanitized = sanitizeBranchName(branchName);
  return path.join(workspace, CONFIG_DIR_NAME, BRANCHES_DIR_NAME, sanitized);
}

export function getBranchContextFilePath(workspace: string, branchName: string): string {
  return path.join(getBranchDirectory(workspace, branchName), BRANCH_CONTEXT_FILENAME);
}
