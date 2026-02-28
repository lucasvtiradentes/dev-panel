import { CONFIG_DIR_KEY } from './scripts-constants';

const TASK_DP = `task-${CONFIG_DIR_KEY}`;

export const CONTEXT_VALUES = {
  GROUP: 'group',
  TASK: 'task',
  TASK_HIDDEN: 'task-hidden',
  TASK_FAVORITE: 'task-favorite',
  TASK_DEVPANEL: TASK_DP,
  TASK_DEVPANEL_HIDDEN: `${TASK_DP}-hidden`,
  TASK_DEVPANEL_FAVORITE: `${TASK_DP}-favorite`,
  TASK_DEVPANEL_GLOBAL: `${TASK_DP}-global`,
  TASK_DEVPANEL_GLOBAL_HIDDEN: `${TASK_DP}-global-hidden`,
  TASK_DEVPANEL_GLOBAL_FAVORITE: `${TASK_DP}-global-favorite`,
  GROUP_ITEM: 'groupItem',
  VARIABLE_ITEM: 'variableItem',
  REPLACEMENT_GROUP: 'replacementGroup',
  REPLACEMENT_ITEM: 'replacementItem',
  EXCLUDE_ITEM: 'excludeItem',
} as const;

const VSCODE_DIR = '.vscode';
const VSCODE_TASKS_FILE = 'tasks.json';
export const VSCODE_TASKS_PATH = `${VSCODE_DIR}/${VSCODE_TASKS_FILE}`;
export const VSCODE_EXTENSIONS_FILE = 'extensions.json';
export const PACKAGE_JSON = 'package.json';
export const KEYBINDINGS_FILE = 'keybindings.json';
export const LICENSE_FILE = 'LICENSE';
export const README_FILE = 'README.md';

export const EDITOR_NAMES = {
  CURSOR: 'Cursor',
  WINDSURF: 'Windsurf',
  CODE: 'Code',
  VSCODIUM: 'VSCodium',
} as const;

export const USER_SETTINGS_DIR = 'User';
