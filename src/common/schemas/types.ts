import { TypeGuardsHelper } from '../utils/helpers/type-guards-helper';

export type NormalizedPatchItem = {
  search: string[];
  replace: string[];
};

export function normalizePatchItem(item: { search: unknown; replace: unknown }): NormalizedPatchItem {
  const normalizeValue = (value: unknown): string[] => {
    if (Array.isArray(value)) return value;
    if (TypeGuardsHelper.isString(value)) return [value];
    return [];
  };

  return {
    search: normalizeValue(item.search),
    replace: normalizeValue(item.replace),
  };
}

export enum TaskSource {
  VSCode = 'vscode',
  Package = 'package',
  DevPanel = 'devpanel',
}

export const TASK_SOURCE_VALUES = Object.values(TaskSource) as [string, ...string[]];

type TaskSourceInfo = {
  id: TaskSource;
  label: string;
  icon: string;
};

export const TASK_SOURCES: TaskSourceInfo[] = [
  { id: TaskSource.VSCode, label: 'VSCode', icon: 'tools' },
  { id: TaskSource.Package, label: 'Package.json', icon: 'package' },
  { id: TaskSource.DevPanel, label: 'DevPanel', icon: 'beaker' },
];

type TaskIcon = {
  id: string;
  color?: string;
};

export type TaskDefinition = {
  label: string;
  hide?: boolean;
  icon?: TaskIcon;
  group?: string;
  type?: string;
  command?: string;
  detail?: string;
};

export type TasksJson = {
  version?: string;
  tasks: TaskDefinition[];
};

export type CodeWorkspaceFile = {
  folders?: { path: string }[];
  tasks?: TasksJson;
};
