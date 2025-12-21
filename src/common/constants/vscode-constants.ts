export const CONTEXT_VALUES = {
  BRANCH_HEADER: 'branchHeader',
  BRANCH_CONTEXT_FIELD: 'branchContextField',
  GROUP: 'group',
  TOOL: 'tool',
  TOOL_HIDDEN: 'tool-hidden',
  TOOL_FAVORITE: 'tool-favorite',
  TASK: 'task',
  TASK_HIDDEN: 'task-hidden',
  TASK_FAVORITE: 'task-favorite',
  PROMPT: 'prompt',
  PROMPT_HIDDEN: 'prompt-hidden',
  PROMPT_FAVORITE: 'prompt-favorite',
  TODO_ITEM: 'todoItem',
  GROUP_ITEM: 'groupItem',
  VARIABLE_ITEM: 'variableItem',
  REPLACEMENT_GROUP: 'replacementGroup',
  REPLACEMENT_ITEM: 'replacementItem',
} as const;

export const VSCODE_DIR = '.vscode';
export const VSCODE_TASKS_FILE = 'tasks.json';
export const VSCODE_TASKS_PATH = `${VSCODE_DIR}/${VSCODE_TASKS_FILE}`;
export const VSCODE_EXTENSIONS_FILE = 'extensions.json';
export const PACKAGE_JSON = 'package.json';
export const KEYBINDINGS_FILE = 'keybindings.json';
export const LICENSE_FILE = 'LICENSE';
export const README_FILE = 'README.md';

export const TOOL_INSTRUCTIONS_FILE = 'instructions.md';
export const SKILL_FILE = 'SKILL.md';
export const AI_SPEC_FILES = ['CLAUDE.md', 'AGENTS.md'] as const;

export const EDITOR_NAMES = {
  CURSOR: 'Cursor',
  WINDSURF: 'Windsurf',
  CODE: 'Code',
  VSCODIUM: 'VSCodium',
} as const;

export const USER_CONFIG_DIR = '.config';
export const USER_SETTINGS_DIR = 'User';
