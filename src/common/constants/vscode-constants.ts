export const CONTEXT_VALUES = {
  BRANCH_CONTEXT_FIELD: 'branchContextField',
  GROUP: 'group',
  TOOL: 'tool',
  TOOL_HIDDEN: 'tool-hidden',
  TOOL_FAVORITE: 'tool-favorite',
  TOOL_GLOBAL: 'tool-global',
  TOOL_GLOBAL_HIDDEN: 'tool-global-hidden',
  TOOL_GLOBAL_FAVORITE: 'tool-global-favorite',
  TASK: 'task',
  TASK_HIDDEN: 'task-hidden',
  TASK_FAVORITE: 'task-favorite',
  TASK_DEVPANEL: 'task-devpanel',
  TASK_DEVPANEL_HIDDEN: 'task-devpanel-hidden',
  TASK_DEVPANEL_FAVORITE: 'task-devpanel-favorite',
  TASK_DEVPANEL_GLOBAL: 'task-devpanel-global',
  TASK_DEVPANEL_GLOBAL_HIDDEN: 'task-devpanel-global-hidden',
  TASK_DEVPANEL_GLOBAL_FAVORITE: 'task-devpanel-global-favorite',
  PROMPT: 'prompt',
  PROMPT_HIDDEN: 'prompt-hidden',
  PROMPT_FAVORITE: 'prompt-favorite',
  PROMPT_GLOBAL: 'prompt-global',
  PROMPT_GLOBAL_HIDDEN: 'prompt-global-hidden',
  PROMPT_GLOBAL_FAVORITE: 'prompt-global-favorite',
  TODO_ITEM: 'todoItem',
  TODO_ITEM_WITH_EXTERNAL: 'todoItemWithExternal',
  MILESTONE_ITEM: 'milestoneItem',
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
export const AI_SPEC_FILES = ['CLAUDE.md', 'AGENTS.md'] as const;

export const EDITOR_NAMES = {
  CURSOR: 'Cursor',
  WINDSURF: 'Windsurf',
  CODE: 'Code',
  VSCODIUM: 'VSCodium',
} as const;

export const USER_CONFIG_DIR = '.config';
export const USER_SETTINGS_DIR = 'User';
