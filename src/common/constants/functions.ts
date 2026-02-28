import { IS_DEV } from './constants';
import {
  CONTEXT_PREFIX,
  REPLACEMENT_COMMAND_SUFFIX,
  TASK_COMMAND_SUFFIX,
  VARIABLE_COMMAND_SUFFIX,
  VIEW_ID_CONFIGS,
  VIEW_ID_EXCLUDES,
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

export function getViewIdExcludes(): string {
  return IS_DEV ? addDevSuffix(VIEW_ID_EXCLUDES) : VIEW_ID_EXCLUDES;
}

export function getLogFilename(): string {
  return buildLogFilename(IS_DEV);
}

function getContextPrefix(): string {
  return IS_DEV ? addDevSuffix(CONTEXT_PREFIX) : CONTEXT_PREFIX;
}

function getReplacementCommandPrefix(): string {
  return `${getContextPrefix()}.${REPLACEMENT_COMMAND_SUFFIX}.`;
}

export function getReplacementCommandId(replacementName: string): string {
  return `${getReplacementCommandPrefix()}${replacementName}`;
}

export function getVariableCommandId(variableName: string): string {
  return `${getVariableCommandPrefix()}${variableName}`;
}

export function getVariableCommandPrefix(): string {
  return `${getContextPrefix()}.${VARIABLE_COMMAND_SUFFIX}.`;
}

export function getTaskCommandId(taskName: string): string {
  return `${getTaskCommandPrefix()}${taskName}`;
}

export function getTaskCommandPrefix(): string {
  return `${getContextPrefix()}.${TASK_COMMAND_SUFFIX}.`;
}

export function isDevPanelCommand(command: string): boolean {
  return (
    command.startsWith(getTaskCommandPrefix()) ||
    command.startsWith(getVariableCommandPrefix()) ||
    command.startsWith(getReplacementCommandPrefix())
  );
}

export function hasWorkspaceIdWhen(when: string | undefined): boolean {
  return when?.includes(`${CONTEXT_PREFIX}.workspaceId`) ?? false;
}
