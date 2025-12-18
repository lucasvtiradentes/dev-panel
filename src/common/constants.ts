export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'better-project-tools';
export const EXTENSION_DISPLAY_NAME = 'Better Project Tools';

export const CONTEXT_PREFIX = 'betterProjectTools';
export const VIEW_CONTAINER_ID = 'betterProjectTools';
export const VIEW_ID_TASKS = 'betterProjectToolsTasks';
export const VIEW_ID_CONFIGS = 'betterProjectToolsConfigs';
export const VIEW_ID_REPLACEMENTS = 'betterProjectToolsReplacements';
export const DEV_SUFFIX = 'dev';

export function addDevSuffix(str: string): string {
  return `${str}${DEV_SUFFIX}`;
}

export function addDevLabel(str: string): string {
  return `${str} (${DEV_SUFFIX})`;
}

export function buildExtensionId(isDev: boolean): string {
  const name = isDev ? `${EXTENSION_NAME}-${DEV_SUFFIX}` : EXTENSION_NAME;
  return `${EXTENSION_PUBLISHER}.${name}`;
}

declare const __IS_DEV_BUILD__: boolean;
export const IS_DEV = typeof __IS_DEV_BUILD__ !== 'undefined' && __IS_DEV_BUILD__;

export const EXTENSION_ID = buildExtensionId(IS_DEV);
export const GLOBAL_STATE_WORKSPACE_SOURCE = '______betterProjectToolsWorkspaceSource______';

export function getCommandId(command: string): string {
  const prefix = IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
  return `${prefix}.${command}`;
}

export function getContextKey(key: string): string {
  return IS_DEV ? addDevSuffix(key) : key;
}

export function getViewContainerId(): string {
  return IS_DEV ? addDevSuffix(VIEW_CONTAINER_ID) : VIEW_CONTAINER_ID;
}

export function getViewIdTasks(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_TASKS) : VIEW_ID_TASKS;
}

export function getViewIdConfigs(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_CONFIGS) : VIEW_ID_CONFIGS;
}

export function getViewIdReplacements(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_REPLACEMENTS) : VIEW_ID_REPLACEMENTS;
}

export function getDisplayName(): string {
  return IS_DEV ? addDevLabel(EXTENSION_DISPLAY_NAME) : EXTENSION_DISPLAY_NAME;
}
