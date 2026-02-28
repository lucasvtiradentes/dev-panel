import { NodeOsHelper, NodePathHelper } from '../utils/helpers/node-helper';

const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'dev-panel';
export const EXTENSION_DISPLAY_NAME = 'Dev Panel';

export const CONFIG_DIR_KEY = 'devpanel';
export const CONFIG_DIR_NAME = `.${CONFIG_DIR_KEY}`;
export const CONFIG_FILE_NAME = 'config.jsonc';
export const VARIABLES_FILE_NAME = 'variables.json';
export const RESOURCES_DIR_NAME = 'resources';
export const INIT_RESOURCES_DIR_NAME = 'init';
export const DEFAULT_INCLUDES = ['**/*'];
export const DEFAULT_EXCLUDES = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**'];
export const DEFAULT_EXCLUDED_DIRS = ['node_modules', 'dist', '.git'];

export const DND_MIME_TYPE_TASKS = `application/vnd.code.tree.${CONFIG_DIR_KEY}tasks`;

export const WORKSPACE_STATE_KEY = `${CONFIG_DIR_KEY}.uiState`;

export const CONTEXT_PREFIX = 'devPanel';
export const VIEW_ID_TASKS_EXPLORER = `${CONTEXT_PREFIX}TasksExplorer`;
export const VIEW_ID_TASKS_PANEL = `${CONTEXT_PREFIX}TasksPanel`;
export const VIEW_ID_CONFIGS = `${CONTEXT_PREFIX}Configs`;
export const VIEW_ID_REPLACEMENTS = `${CONTEXT_PREFIX}Replacements`;
export const VIEW_ID_EXCLUDES = `${CONTEXT_PREFIX}Excludes`;
export const DEV_SUFFIX = 'dev';
const LOG_BASENAME = EXTENSION_NAME;
export const GLOBAL_TASK_TYPE = `${CONFIG_DIR_KEY}-global`;
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
  return NodePathHelper.join(NodeOsHelper.homedir(), CONFIG_DIR_NAME);
}

export function getGlobalConfigPath(): string {
  return NodePathHelper.join(getGlobalConfigDir(), CONFIG_FILE_NAME);
}

export function getGlobalVariablesPath(): string {
  return NodePathHelper.join(getGlobalConfigDir(), VARIABLES_FILE_NAME);
}

export function getVscodeTasksFilePath(workspacePath: string): string {
  return NodePathHelper.join(workspacePath, '.vscode', 'tasks.json');
}

export const WORKSPACE_STATE_CONFIG_DIR_KEY = `${CONFIG_DIR_KEY}.configDir`;

const GLOBAL_ITEM_TOOLTIP_SUFFIX = `from ~/${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME}`;
export const GLOBAL_TASK_TOOLTIP = `Global task ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;

export const NOT_GIT_REPO_MESSAGE = 'Not a git repository';
