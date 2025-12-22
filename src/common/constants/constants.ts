declare const __IS_DEV_BUILD__: boolean;
export const IS_DEV = typeof __IS_DEV_BUILD__ !== 'undefined' && __IS_DEV_BUILD__;

export const GLOBAL_STATE_WORKSPACE_SOURCE = '______projectPanelWorkspaceSource______';
export const GLOBAL_STATE_KEY = 'pp.globalUIState';
export const GLOBAL_ITEM_PREFIX = '(G) ';

export const LOG_CONTEXT_WIDTH = 20;
export const LOG_TIMEZONE_OFFSET_HOURS = -3;

export const BRANCH_FIELD_DESCRIPTION_MAX_LENGTH = 50;

export const CLAUDE_DIR = '.claude';
export const SKILLS_DIR = 'skills';
export const TOOLS_DIR = 'tools';

export const BRANCH_CONTEXT_SECTION_OBJECTIVE = '# OBJECTIVE';
export const BRANCH_CONTEXT_SECTION_NOTES = '# NOTES';
export const BRANCH_CONTEXT_SECTION_TODO = '# TODO';

export const BRANCH_CONTEXT_FIELD_PR_LINK = 'PR LINK:';
export const BRANCH_CONTEXT_FIELD_LINEAR_LINK = 'LINEAR LINK:';

export const TODO_CHECKBOX_UNCHECKED = '[ ]';
export const TODO_CHECKBOX_CHECKED_LOWER = '[x]';
export const TODO_CHECKBOX_CHECKED_UPPER = '[X]';
