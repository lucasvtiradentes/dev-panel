export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'better-project-tools';
export const EXTENSION_DISPLAY_NAME = 'Better Project Tools';

export const CONTEXT_PREFIX = 'betterProjectTools';
export const VIEW_ID = 'betterProjectToolsTasks';
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
