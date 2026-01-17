import { VscodeIcon } from '../vscode/vscode-constants';
import { CONFIG_DIR_KEY, CONTEXT_PREFIX } from './scripts-constants';

declare const __IS_DEV_BUILD__: boolean;
export const IS_DEV = typeof __IS_DEV_BUILD__ !== 'undefined' && __IS_DEV_BUILD__;

export const GLOBAL_STATE_WORKSPACE_SOURCE = `______${CONTEXT_PREFIX}WorkspaceSource______`;
export const GLOBAL_STATE_KEY = `${CONFIG_DIR_KEY}.globalUIState`;
export const GLOBAL_ITEM_PREFIX = '(G) ';

export const BRANCH_FIELD_DESCRIPTION_MAX_LENGTH = 50;

const BRANCH_CONTEXT_SECTION_BRANCH_INFO = '# BRANCH INFO';
const BRANCH_CONTEXT_SECTION_OBJECTIVE = '# OBJECTIVE';
const BRANCH_CONTEXT_SECTION_REQUIREMENTS = '# REQUIREMENTS';
const BRANCH_CONTEXT_SECTION_NOTES = '# NOTES';
const BRANCH_CONTEXT_SECTION_TODO = '# TASKS';
const BRANCH_CONTEXT_SECTION_CHANGED_FILES = '# CHANGED FILES';

export const BRANCH_CONTEXT_FIELD_BRANCH = 'BRANCH:';
export const BRANCH_CONTEXT_FIELD_TYPE = 'TYPE:';
export const BRANCH_CONTEXT_FIELD_PR_LINK = 'PR LINK:';
export const BRANCH_CONTEXT_FIELD_LINEAR_LINK = 'LINEAR LINK:';

export const BRANCH_TYPES = ['feature', 'bugfix', 'chore', 'other'] as const;
export type BranchType = (typeof BRANCH_TYPES)[number];

export const SECTION_NAME_BRANCH = BRANCH_CONTEXT_FIELD_BRANCH.replace(':', '').trim();
export const SECTION_NAME_PR_LINK = BRANCH_CONTEXT_FIELD_PR_LINK.replace(':', '').trim();
export const SECTION_NAME_LINEAR_LINK = BRANCH_CONTEXT_FIELD_LINEAR_LINK.replace(':', '').trim();
export const SECTION_NAME_OBJECTIVE = BRANCH_CONTEXT_SECTION_OBJECTIVE.replace('#', '').trim();
export const SECTION_NAME_REQUIREMENTS = BRANCH_CONTEXT_SECTION_REQUIREMENTS.replace('#', '').trim();
export const SECTION_NAME_NOTES = BRANCH_CONTEXT_SECTION_NOTES.replace('#', '').trim();
export const SECTION_NAME_TASKS = BRANCH_CONTEXT_SECTION_TODO.replace('#', '').trim();
export const SECTION_NAME_BRANCH_INFO = BRANCH_CONTEXT_SECTION_BRANCH_INFO.replace('#', '').trim();
export const SECTION_NAME_CHANGED_FILES = BRANCH_CONTEXT_SECTION_CHANGED_FILES.replace('#', '').trim();

export const BUILTIN_SECTION_NAMES = [SECTION_NAME_BRANCH_INFO, SECTION_NAME_TASKS, SECTION_NAME_CHANGED_FILES];

export const SECTION_LABEL_BRANCH = 'Branch';
export const SECTION_LABEL_CHANGED_FILES = 'Changed files';

export const TASK_STATUS_MARKERS = {
  TODO: '[ ]',
  DOING: '[>]',
  DONE_LOWER: '[x]',
  DONE_UPPER: '[X]',
  BLOCKED: '[!]',
} as const;

export const ROOT_FOLDER_LABEL = '.';

export const QUICK_PICK_ACTION_SELECT = '__select__';
export const QUICK_PICK_ACTION_PARENT = '__parent__';
export const QUICK_PICK_ACTION_SEPARATOR = '__separator__';

export const JSON_INDENT_SPACES = 4;
export const CONFIG_INDENT = '    ';

export const BASE_BRANCH = 'origin/main';

export const BRANCH_CONTEXT_DEFAULT_ICON = VscodeIcon.SymbolField;

export const DESCRIPTION_NOT_SET = '(not set)';
export const DESCRIPTION_NOT_SYNCED = '(not synced)';

export enum ChangedFilesStyle {
  Tree = 'tree',
  List = 'list',
}
