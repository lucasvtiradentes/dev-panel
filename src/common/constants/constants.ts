import {
  CONTEXT_PREFIX,
  VIEW_ID_BRANCH_CONTEXT,
  VIEW_ID_CONFIGS,
  VIEW_ID_PROMPTS,
  VIEW_ID_REPLACEMENTS,
  VIEW_ID_TASKS,
  VIEW_ID_TODOS,
  VIEW_ID_TOOLS,
  addDevSuffix,
  buildLogFilename,
} from './scripts-constants';

export {
  CONTEXT_PREFIX,
  DEV_SUFFIX,
} from './scripts-constants';

declare const __IS_DEV_BUILD__: boolean;
export const IS_DEV = typeof __IS_DEV_BUILD__ !== 'undefined' && __IS_DEV_BUILD__;

export const GLOBAL_STATE_WORKSPACE_SOURCE = '______betterProjectToolsWorkspaceSource______';

export function getCommandId(command: string): string {
  const prefix = IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
  return `${prefix}.${command}`;
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

export function getViewIdBranchContext(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_BRANCH_CONTEXT) : VIEW_ID_BRANCH_CONTEXT;
}

export function getViewIdTodos(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_TODOS) : VIEW_ID_TODOS;
}

export function getLogFilename(): string {
  return buildLogFilename(IS_DEV);
}
