import { CONTEXT_PREFIX } from '../constants';
import { Command, executeCommand } from './vscode-commands';

export const ContextKey = {
  NoConfig: 'noConfig',
  ExtensionInitializing: 'extensionInitializing',
  TaskSourceVSCode: 'taskSourceVSCode',
  TaskSourcePackage: 'taskSourcePackage',
  TaskSourceDevPanel: 'taskSourceDevPanel',
  TasksGrouped: 'tasksGrouped',
  TasksHasGroups: 'tasksHasGroups',
  TasksHasHidden: 'tasksHasHidden',
  TasksShowHidden: 'tasksShowHidden',
  TasksHasFavorites: 'tasksHasFavorites',
  TasksShowOnlyFavorites: 'tasksShowOnlyFavorites',
  PromptsGrouped: 'promptsGrouped',
  PromptsHasHidden: 'promptsHasHidden',
  PromptsShowHidden: 'promptsShowHidden',
  PromptsHasFavorites: 'promptsHasFavorites',
  PromptsShowOnlyFavorites: 'promptsShowOnlyFavorites',
  ReplacementsGrouped: 'replacementsGrouped',
  ReplacementsAllActive: 'replacementsAllActive',
  ConfigsGrouped: 'configsGrouped',
  WorkspaceId: `${CONTEXT_PREFIX}.workspaceId`,
} as const;

export type ContextKey = (typeof ContextKey)[keyof typeof ContextKey];

export function setContextKey(key: ContextKey, value: boolean | string): Thenable<unknown> {
  return executeCommand(Command.VscodeSetContext, key, value);
}
