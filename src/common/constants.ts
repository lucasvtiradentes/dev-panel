const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'better-project-tools';

export const CONTEXT_PREFIX = 'betterProjectTools';
export const VIEW_ID_TASKS = 'betterProjectToolsTasks';
const VIEW_ID_CONFIGS = 'betterProjectToolsConfigs';
const VIEW_ID_REPLACEMENTS = 'betterProjectToolsReplacements';
const VIEW_ID_TOOLS = 'betterProjectToolsTools';
const VIEW_ID_PROMPTS = 'betterProjectToolsPrompts';
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

export const GLOBAL_STATE_WORKSPACE_SOURCE = '______betterProjectToolsWorkspaceSource______';

export function getCommandId(command: string): string {
  const prefix = IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
  return `${prefix}.${command}`;
}

export function getContextKey(key: string): string {
  return IS_DEV ? addDevSuffix(key) : key;
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

export function getViewIdTools(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_TOOLS) : VIEW_ID_TOOLS;
}

export function getViewIdPrompts(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_PROMPTS) : VIEW_ID_PROMPTS;
}
