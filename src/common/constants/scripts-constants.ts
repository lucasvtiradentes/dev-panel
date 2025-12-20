export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'project-panel';
export const EXTENSION_DISPLAY_NAME = 'Project Panel';

export const CONFIG_DIR_NAME = '.pp';
export const CONFIG_DIR_KEY = 'pp'; // Key used in workspace state objects (without the dot)
export const DISPLAY_PREFIX = 'Project Panel:';

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
