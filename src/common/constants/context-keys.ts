export const CONTEXT_KEYS = [
  'noConfig',
  'extensionInitializing',
  'taskSourceVSCode',
  'taskSourcePackage',
  'taskSourceDevPanel',
  'tasksGrouped',
  'tasksHasGroups',
  'tasksHasHidden',
  'tasksShowHidden',
  'tasksHasFavorites',
  'tasksShowOnlyFavorites',
  'promptsGrouped',
  'promptsHasHidden',
  'promptsShowHidden',
  'promptsHasFavorites',
  'promptsShowOnlyFavorites',
  'replacementsGrouped',
  'replacementsAllActive',
  'configsGrouped',
] as const;

export type ContextKeyValue = (typeof CONTEXT_KEYS)[number];
