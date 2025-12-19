export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'better-project-tools';
export const EXTENSION_DISPLAY_NAME = 'Better Project Tools';

export const CONTEXT_PREFIX = 'betterProjectTools';
export const VIEW_ID_TASKS = 'betterProjectToolsTasks';
export const VIEW_ID_CONFIGS = 'betterProjectToolsConfigs';
export const VIEW_ID_REPLACEMENTS = 'betterProjectToolsReplacements';
export const VIEW_ID_TOOLS = 'betterProjectToolsTools';
export const VIEW_ID_PROMPTS = 'betterProjectToolsPrompts';
export const VIEW_ID_BRANCH_CONTEXT = 'betterProjectToolsBranchContext';
export const DEV_SUFFIX = 'dev';
export const LOG_BASENAME = 'better-project-tools';

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

export function buildLogFilename(isDev: boolean): string {
  return isDev ? `${LOG_BASENAME}-${DEV_SUFFIX}.log` : `${LOG_BASENAME}.log`;
}
