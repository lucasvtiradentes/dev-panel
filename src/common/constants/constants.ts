declare const __IS_DEV_BUILD__: boolean;
export const IS_DEV = typeof __IS_DEV_BUILD__ !== 'undefined' && __IS_DEV_BUILD__;

export const GLOBAL_STATE_WORKSPACE_SOURCE = '______projectPanelWorkspaceSource______';
export const GLOBAL_STATE_KEY = 'pp.globalUIState';
export const GLOBAL_ITEM_PREFIX = '(G) ';

export const LOG_CONTEXT_WIDTH = 20;
export const LOG_TIMEZONE_OFFSET_HOURS = -3;

export const BRANCH_FIELD_DESCRIPTION_MAX_LENGTH = 50;

export const TOOLS_DIR = 'tools';

export const BRANCH_CONTEXT_SECTION_BRANCH_INFO = '# BRANCH INFO';
export const BRANCH_CONTEXT_SECTION_OBJECTIVE = '# OBJECTIVE';
export const BRANCH_CONTEXT_SECTION_REQUIREMENTS = '# REQUIREMENTS';
export const BRANCH_CONTEXT_SECTION_NOTES = '# NOTES';
export const BRANCH_CONTEXT_SECTION_TODO = '# TASKS';
export const BRANCH_CONTEXT_SECTION_CHANGED_FILES = '# CHANGED FILES';

export const BRANCH_CONTEXT_FIELD_BRANCH = 'BRANCH:';
export const BRANCH_CONTEXT_FIELD_PR_LINK = 'PR LINK:';
export const BRANCH_CONTEXT_FIELD_LINEAR_LINK = 'LINEAR LINK:';

export const TODO_CHECKBOX_UNCHECKED = '[ ]';
export const TODO_CHECKBOX_CHECKED_LOWER = '[x]';
export const TODO_CHECKBOX_CHECKED_UPPER = '[X]';

export const ROOT_FOLDER_LABEL = '.';

export const QUICK_PICK_ACTION_SELECT = '__select__';
export const QUICK_PICK_ACTION_PARENT = '__parent__';
export const QUICK_PICK_ACTION_SEPARATOR = '__separator__';

export const JSON_INDENT_SPACES = 4;
export const CONFIG_INDENT = '    ';

export const STATUS_BAR_UNDEFINED_TASK = '-- UNDEFINED TASK --';
export const STATUS_BAR_COMMAND_PREFIX = '/';
export const TASK_SOURCE_WORKSPACE = 'Workspace';

export const BASE_BRANCH = 'origin/main';

export const BRANCH_CONTEXT_DEFAULT_ICON = 'symbol-field';

export enum ChangedFilesStyle {
  Tree = 'tree',
  List = 'list',
}
