import { IS_DEV } from './constants';
import {
  CONTEXT_PREFIX,
  REPLACEMENT_COMMAND_SUFFIX,
  TASK_COMMAND_SUFFIX,
  VARIABLE_COMMAND_SUFFIX,
  VIEW_ID_CONFIGS,
  VIEW_ID_REPLACEMENTS,
  VIEW_ID_TASKS_EXPLORER,
  VIEW_ID_TASKS_PANEL,
  addDevSuffix,
  buildLogFilename,
} from './scripts-constants';

export function getCommandId(command: string): string {
  const prefix = IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
  return `${prefix}.${command}`;
}

export function getViewIdTasksExplorer(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_TASKS_EXPLORER) : VIEW_ID_TASKS_EXPLORER;
}

export function getViewIdTasksPanel(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_TASKS_PANEL) : VIEW_ID_TASKS_PANEL;
}

export function getViewIdConfigs(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_CONFIGS) : VIEW_ID_CONFIGS;
}

export function getViewIdReplacements(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_REPLACEMENTS) : VIEW_ID_REPLACEMENTS;
}

export function getLogFilename(): string {
  return buildLogFilename(IS_DEV);
}

export function getReplacementCommandId(replacementName: string): string {
  const prefix = IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
  return `${prefix}.${REPLACEMENT_COMMAND_SUFFIX}.${replacementName}`;
}

export function getVariableCommandId(variableName: string): string {
  const prefix = IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
  return `${prefix}.${VARIABLE_COMMAND_SUFFIX}.${variableName}`;
}

export function getVariableCommandPrefix(): string {
  const prefix = IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
  return `${prefix}.${VARIABLE_COMMAND_SUFFIX}.`;
}

export function getTaskCommandId(taskName: string): string {
  const prefix = IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
  return `${prefix}.${TASK_COMMAND_SUFFIX}.${taskName}`;
}

export function getTaskCommandPrefix(): string {
  const prefix = IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
  return `${prefix}.${TASK_COMMAND_SUFFIX}.`;
}
