import { CONTEXT_PREFIX } from './scripts-constants';

declare const __IS_DEV_BUILD__: boolean;
export const IS_DEV = typeof __IS_DEV_BUILD__ !== 'undefined' && __IS_DEV_BUILD__;

export const GLOBAL_STATE_WORKSPACE_SOURCE = `______${CONTEXT_PREFIX}WorkspaceSource______`;

export const ROOT_FOLDER_LABEL = '.';

export const QUICK_PICK_ACTION_SELECT = '__select__';
export const QUICK_PICK_ACTION_PARENT = '__parent__';
export const QUICK_PICK_ACTION_SEPARATOR = '__separator__';

export const BASE_BRANCH = 'origin/main';

export const DESCRIPTION_NOT_SET = '';

export enum ChangedFilesStyle {
  Tree = 'tree',
}
