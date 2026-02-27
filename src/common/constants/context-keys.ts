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
  'replacementsGrouped',
  'replacementsAllActive',
  'configsGrouped',
] as const;

export type ContextKeyValue = (typeof CONTEXT_KEYS)[number];
