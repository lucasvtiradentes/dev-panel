import { NodeOsHelper, NodePathHelper } from '../utils/helpers/node-helper';

export const TOOLS_DIR = 'tools';
export const TOOL_INSTRUCTIONS_FILE = 'instructions.md';

const EXTENSION_PUBLISHER = 'lucasvtiradentes';
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

const METADATA_DEVPANEL = 'DEVPANEL_METADATA';
export const METADATA_DEVPANEL_PREFIX = `<!-- ${METADATA_DEVPANEL}: `;
export const METADATA_DEVPANEL_REGEX = new RegExp(`<!--\\s*${METADATA_DEVPANEL}:.*?-->`);
export const METADATA_SECTION = 'SECTION_METADATA';
export const METADATA_SECTION_PREFIX = `<!-- ${METADATA_SECTION}: `;
export const METADATA_SECTION_REGEX_CAPTURE = new RegExp(`<!--\\s*${METADATA_SECTION}:\\s*(.+?)\\s*-->`);
export const METADATA_SECTION_REGEX_GLOBAL = new RegExp(`<!--\\s*${METADATA_SECTION}:.*?-->`, 'g');
export const METADATA_SUFFIX = ' -->';
export const METADATA_SEPARATOR = '<!-- ------------------- -->';
export const METADATA_SECTION_WITH_CODEBLOCK_REGEX = new RegExp(
  `^#\\s+([A-Z][A-Z\\s]+)\\s*\\n+\`\`\`\\s*\\n([\\s\\S]*?)\\n\`\`\`(\\s*\\n+<!-- ${METADATA_SECTION}: (.+?) -->)?`,
  'gm',
);
export const METADATA_SEPARATOR_REGEX = /<!--\s*-+\s*-->/;

export const METADATA_FIELD_IS_EMPTY = 'isEmpty';
export const METADATA_FIELD_DESCRIPTION = 'description';

export const MARKDOWN_SECTION_DESCRIPTION = 'description';

export const DND_MIME_TYPE_TASKS = `application/vnd.code.tree.${CONFIG_DIR_KEY}tasks`;
export const DND_MIME_TYPE_PROMPTS = `application/vnd.code.tree.${CONFIG_DIR_KEY}prompts`;
export const DND_MIME_TYPE_TOOLS = `application/vnd.code.tree.${CONFIG_DIR_KEY}tools`;
export const DND_MIME_TYPE_BRANCH_TASKS = `application/vnd.code.tree.${CONFIG_DIR_KEY}branchtasks`;

export const WORKSPACE_STATE_KEY = `${CONFIG_DIR_KEY}.uiState`;

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
  return NodePathHelper.join(NodeOsHelper.homedir(), CONFIG_DIR_NAME);
}

export function getGlobalConfigPath(): string {
  return NodePathHelper.join(getGlobalConfigDir(), CONFIG_FILE_NAME);
}

export function getGlobalVariablesPath(): string {
  return NodePathHelper.join(getGlobalConfigDir(), VARIABLES_FILE_NAME);
}

function getGlobalToolsDir(): string {
  return NodePathHelper.join(getGlobalConfigDir(), TOOLS_DIR);
}

export function getGlobalToolInstructionsPath(toolName: string): string {
  return NodePathHelper.join(getGlobalToolsDir(), toolName, TOOL_INSTRUCTIONS_FILE);
}

export function getSkillDir(workspacePath: string, skillName: string): string {
  return NodePathHelper.join(workspacePath, CLAUDE_DIR_NAME, SKILLS_DIR_NAME, skillName);
}

export function getSkillFilePath(workspacePath: string, skillName: string): string {
  return NodePathHelper.join(getSkillDir(workspacePath, skillName), SKILL_FILE_NAME);
}

export function getGlobalToolDir(toolName: string): string {
  return NodePathHelper.join(getGlobalToolsDir(), toolName);
}

export function getGlobalPromptFilePath(promptFile: string): string {
  return NodePathHelper.join(getGlobalConfigDir(), promptFile);
}

export function getVscodeTasksFilePath(workspacePath: string): string {
  return NodePathHelper.join(workspacePath, '.vscode', 'tasks.json');
}

export const WORKSPACE_STATE_CONFIG_DIR_KEY = `${CONFIG_DIR_KEY}.configDir`;

const GLOBAL_ITEM_TOOLTIP_SUFFIX = `from ~/${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME}`;
export const GLOBAL_PROMPT_TOOLTIP = `Global prompt ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;
export const GLOBAL_TASK_TOOLTIP = `Global task ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;
export const GLOBAL_TOOL_TOOLTIP = `Global tool ${GLOBAL_ITEM_TOOLTIP_SUFFIX}`;

export const NOT_GIT_REPO_MESSAGE = 'Not a git repository';
