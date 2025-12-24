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

export const SECTION_NAME_BRANCH = BRANCH_CONTEXT_FIELD_BRANCH.replace(':', '').trim();
export const SECTION_NAME_PR_LINK = BRANCH_CONTEXT_FIELD_PR_LINK.replace(':', '').trim();
export const SECTION_NAME_LINEAR_LINK = BRANCH_CONTEXT_FIELD_LINEAR_LINK.replace(':', '').trim();
export const SECTION_NAME_OBJECTIVE = BRANCH_CONTEXT_SECTION_OBJECTIVE.replace('#', '').trim();
export const SECTION_NAME_REQUIREMENTS = BRANCH_CONTEXT_SECTION_REQUIREMENTS.replace('#', '').trim();
export const SECTION_NAME_NOTES = BRANCH_CONTEXT_SECTION_NOTES.replace('#', '').trim();
export const SECTION_NAME_TASKS = BRANCH_CONTEXT_SECTION_TODO.replace('#', '').trim();
export const SECTION_NAME_BRANCH_INFO = BRANCH_CONTEXT_SECTION_BRANCH_INFO.replace('#', '').trim();
export const SECTION_NAME_CHANGED_FILES = BRANCH_CONTEXT_SECTION_CHANGED_FILES.replace('#', '').trim();

export const BUILTIN_SECTION_NAMES = [
  SECTION_NAME_BRANCH_INFO,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_REQUIREMENTS,
  SECTION_NAME_NOTES,
  SECTION_NAME_TASKS,
  SECTION_NAME_CHANGED_FILES,
];

export const SECTION_LABEL_BRANCH = 'Branch';
export const SECTION_LABEL_PR_LINK = 'PR link';
export const SECTION_LABEL_LINEAR_LINK = 'Linear link';
export const SECTION_LABEL_OBJECTIVE = 'Objective';
export const SECTION_LABEL_REQUIREMENTS = 'Requirements';
export const SECTION_LABEL_NOTES = 'Notes';
export const SECTION_LABEL_CHANGED_FILES = 'Changed files';

export const TODO_CHECKBOX_UNCHECKED = '[ ]';
export const TODO_CHECKBOX_CHECKED_LOWER = '[x]';
export const TODO_CHECKBOX_CHECKED_UPPER = '[X]';

export const ROOT_FOLDER_LABEL = '.';

export const QUICK_PICK_ACTION_SELECT = '__select__';
export const QUICK_PICK_ACTION_PARENT = '__parent__';
export const QUICK_PICK_ACTION_SEPARATOR = '__separator__';

export const JSON_INDENT_SPACES = 4;
export const CONFIG_INDENT = '    ';

export const BASE_BRANCH = 'origin/main';

export const BRANCH_CONTEXT_DEFAULT_ICON = 'symbol-field';

export const DESCRIPTION_NOT_SET = '(not set)';
export const DESCRIPTION_NOT_SYNCED = '(not synced)';

export enum ChangedFilesStyle {
  Tree = 'tree',
  List = 'list',
}
