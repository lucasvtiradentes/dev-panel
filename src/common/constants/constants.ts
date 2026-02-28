import { CONFIG_DIR_KEY, CONTEXT_PREFIX } from './scripts-constants';

declare const __IS_DEV_BUILD__: boolean;
export const IS_DEV = typeof __IS_DEV_BUILD__ !== 'undefined' && __IS_DEV_BUILD__;

export const GLOBAL_STATE_WORKSPACE_SOURCE = `______${CONTEXT_PREFIX}WorkspaceSource______`;
export const GLOBAL_STATE_KEY = `${CONFIG_DIR_KEY}.globalUIState`;
export const GLOBAL_ITEM_PREFIX = '(G) ';

export function stripGlobalPrefix(name: string): string {
  return name.startsWith(GLOBAL_ITEM_PREFIX) ? name.substring(GLOBAL_ITEM_PREFIX.length) : name;
}

export function isGlobalItem(name: string): boolean {
  return name.startsWith(GLOBAL_ITEM_PREFIX);
}

export const ROOT_FOLDER_LABEL = '.';

export const QUICK_PICK_ACTION_SELECT = '__select__';
export const QUICK_PICK_ACTION_PARENT = '__parent__';
export const QUICK_PICK_ACTION_SEPARATOR = '__separator__';

export const BASE_BRANCH = 'origin/main';

export const DESCRIPTION_NOT_SET = '(not set)';

export enum ChangedFilesStyle {
  Tree = 'tree',
}
