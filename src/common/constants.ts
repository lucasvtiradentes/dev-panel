import {
  CONTEXT_PREFIX,
  DEV_SUFFIX,
  EXTENSION_DISPLAY_NAME,
  EXTENSION_NAME,
  EXTENSION_PUBLISHER,
  VIEW_ID,
  addDevLabel,
  buildExtensionId,
} from './scripts-constants';

declare const __IS_DEV_BUILD__: boolean;
export const IS_DEV = typeof __IS_DEV_BUILD__ !== 'undefined' && __IS_DEV_BUILD__;

export const EXTENSION_ID = buildExtensionId(IS_DEV);
export const GLOBAL_STATE_WORKSPACE_SOURCE = '______betterProjectToolsWorkspaceSource______';

export function getCommandId(command: string): string {
  const prefix = IS_DEV ? `${CONTEXT_PREFIX}${DEV_SUFFIX}` : CONTEXT_PREFIX;
  return `${prefix}.${command}`;
}

export function getContextKey(key: string): string {
  return IS_DEV ? `${key}${DEV_SUFFIX}` : key;
}

export function getViewId(): string {
  return IS_DEV ? `${VIEW_ID}${DEV_SUFFIX}` : VIEW_ID;
}

export function getDisplayName(): string {
  return IS_DEV ? addDevLabel(EXTENSION_DISPLAY_NAME) : EXTENSION_DISPLAY_NAME;
}

export {
  CONTEXT_PREFIX,
  DEV_SUFFIX,
  EXTENSION_DISPLAY_NAME,
  EXTENSION_NAME,
  EXTENSION_PUBLISHER,
  VIEW_ID,
  addDevLabel,
};
