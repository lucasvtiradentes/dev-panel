export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'project-panel';
export const EXTENSION_DISPLAY_NAME = 'Project Panel';

export const CONFIG_DIR_NAME = '.pp';
export const CONFIG_DIR_KEY = 'pp'; // Key used in workspace state objects (without the dot)
export const DISPLAY_PREFIX = 'Project Panel:';
export const CONFIG_FILE_NAME = 'config.jsonc';
export const VARIABLES_FILE_NAME = 'variables.json';
export const BRANCH_CONTEXT_FILE_NAME = '.branch-context.md';
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
