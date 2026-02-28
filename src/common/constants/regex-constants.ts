export const CONFIG_TASKS_ARRAY_PATTERN = /"tasks"\s*:\s*\[/;
export const PACKAGE_JSON_SCRIPTS_PATTERN = /"scripts"\s*:\s*\{/;

export const DIST_DIR_PREFIX = 'dist-';

export const createVariablePlaceholderPattern = (variable: string) => new RegExp(`\\$${variable}`, 'g');
