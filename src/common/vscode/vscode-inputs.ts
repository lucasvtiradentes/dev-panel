import path from 'node:path';
import { ROOT_FOLDER_LABEL, createVariablePlaceholderPattern } from '../constants';
import { ConfigManager } from '../core/config-manager';
import { VariablesEnvManager } from '../core/variables-env-manager';
import { createLogger } from '../lib/logger';
import { type DevPanelInput, InputType } from '../schemas';
import { ToastKind, VscodeHelper } from './vscode-helper';
import type { QuickPickItem, WorkspaceFolder } from './vscode-types';

const ERROR_MSG_WORKSPACE_REQUIRED = 'File/folder input requires a workspace folder';
const ERROR_MSG_INVALID_NUMBER = 'Please enter a valid number';
const CONFIRM_YES = 'Yes';
const CONFIRM_NO = 'No';
const CONFIRM_OPTIONS = [CONFIRM_YES, CONFIRM_NO] as const;

const log = createLogger('inputs');

export type FileSelectionOptions = {
  label: string;
  multiSelect?: boolean;
  includes?: string[];
  excludes?: string[];
  basePath?: string;
};

type InternalSelectionOptions = {
  workspaceFolder: WorkspaceFolder;
  label: string;
  multiSelect: boolean;
  includes: string[];
  excludes: string[];
  basePath?: string;
};

function buildGlob(patterns: string[]): string {
  if (patterns.length === 1) return patterns[0];
  return `{${patterns.join(',')}}`;
}

type ResolvedPattern = { base: string; pattern: string };

function resolvePatternWithParentRefs(basePath: string, pattern: string): ResolvedPattern {
  let currentBase = basePath;
  let currentPattern = pattern;

  while (currentPattern.startsWith('../')) {
    currentBase = path.dirname(currentBase);
    currentPattern = currentPattern.slice(3);
  }

  return { base: currentBase, pattern: currentPattern };
}

function groupPatternsByBase(basePath: string, patterns: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const pattern of patterns) {
    const resolved = resolvePatternWithParentRefs(basePath, pattern);
    const existing = groups.get(resolved.base);
    if (existing) {
      existing.push(resolved.pattern);
    } else {
      groups.set(resolved.base, [resolved.pattern]);
    }
  }

  return groups;
}

async function findFilesWithGroupedPatterns(
  basePath: string,
  includes: string[],
  excludeGlob: string,
): Promise<ReturnType<typeof VscodeHelper.findFiles>> {
  const groups = groupPatternsByBase(basePath, includes);

  if (groups.size === 0) {
    return VscodeHelper.findFiles(VscodeHelper.createRelativePattern(basePath, '**/*'), excludeGlob);
  }

  if (groups.size === 1) {
    const [base, patterns] = groups.entries().next().value as [string, string[]];
    return VscodeHelper.findFiles(VscodeHelper.createRelativePattern(base, buildGlob(patterns)), excludeGlob);
  }

  const allFiles: Awaited<ReturnType<typeof VscodeHelper.findFiles>> = [];
  const seenPaths = new Set<string>();

  for (const [base, patterns] of groups) {
    const files = await VscodeHelper.findFiles(
      VscodeHelper.createRelativePattern(base, buildGlob(patterns)),
      excludeGlob,
    );
    for (const file of files) {
      if (!seenPaths.has(file.fsPath)) {
        seenPaths.add(file.fsPath);
        allFiles.push(file);
      }
    }
  }

  return allFiles;
}

function replaceVariablesInPatterns(patterns: string[] | undefined, folder: WorkspaceFolder): string[] | undefined {
  if (!patterns || patterns.length === 0) return patterns;

  const variablesPath = ConfigManager.getWorkspaceVariablesPath(folder);
  const variables = VariablesEnvManager.readDevPanelVariablesAsEnv(variablesPath);

  if (Object.keys(variables).length === 0) return patterns;

  return patterns.map((pattern) => {
    let result = pattern;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\$${key}`, 'g'), value);
    }
    return result;
  });
}

export async function selectFiles(
  workspaceFolder: WorkspaceFolder,
  options: FileSelectionOptions,
): Promise<string | undefined> {
  const includes = options.includes ?? ['**/*'];
  const excludes = options.excludes ?? [];
  log.info(`selectFiles - multiSelect: ${options.multiSelect ?? false}`);
  return selectFilesFlat({
    workspaceFolder,
    label: options.label,
    multiSelect: options.multiSelect ?? false,
    includes,
    excludes,
    basePath: options.basePath,
  });
}

async function selectFilesFlat(opts: InternalSelectionOptions): Promise<string | undefined> {
  const { workspaceFolder, label, multiSelect, includes, excludes, basePath } = opts;
  const initialBase = basePath ?? workspaceFolder.uri.fsPath;
  const excludeGlob = buildGlob(excludes);
  const files = await findFilesWithGroupedPatterns(initialBase, includes, excludeGlob);
  log.info(`selectFilesFlat - found ${files.length} files`);

  const items: QuickPickItem[] = files.map((uri) => ({
    label: VscodeHelper.asRelativePath(uri, false),
    description: uri.fsPath,
  }));

  items.sort((a, b) => a.label.localeCompare(b.label));

  if (multiSelect) {
    const result = await VscodeHelper.showQuickPickItems(items, {
      placeHolder: label,
      canPickMany: true,
      ignoreFocusOut: true,
      matchOnDescription: true,
    });
    if (!result || result.length === 0) return undefined;
    return result
      .filter((item) => item.description)
      .map((item) => item.description as string)
      .join('\n');
  }

  const result = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: label,
    canPickMany: false,
    ignoreFocusOut: true,
    matchOnDescription: true,
  });
  return result?.description;
}

export async function selectFolders(
  workspaceFolder: WorkspaceFolder,
  options: FileSelectionOptions,
): Promise<string | undefined> {
  const includes = options.includes ?? ['**/*'];
  const excludes = options.excludes ?? [];
  log.info(`selectFolders - multiSelect: ${options.multiSelect ?? false}`);
  return selectFoldersFlat({
    workspaceFolder,
    label: options.label,
    multiSelect: options.multiSelect ?? false,
    includes,
    excludes,
    basePath: options.basePath,
  });
}

async function selectFoldersFlat(opts: InternalSelectionOptions): Promise<string | undefined> {
  const { workspaceFolder, label, multiSelect, includes, excludes, basePath } = opts;
  const initialBase = basePath ?? workspaceFolder.uri.fsPath;
  const excludeGlob = buildGlob(excludes);
  const files = await findFilesWithGroupedPatterns(initialBase, includes, excludeGlob);

  const folderSet = new Set<string>();
  for (const file of files) {
    const relativePath = VscodeHelper.asRelativePath(file, false);
    const parts = relativePath.split('/');
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      folderSet.add(currentPath);
    }
  }

  const folders = Array.from(folderSet).sort();
  const items: QuickPickItem[] = folders.map((folder) => ({
    label: folder,
    description: `${workspaceFolder.uri.fsPath}/${folder}`,
  }));

  items.unshift({
    label: ROOT_FOLDER_LABEL,
    description: workspaceFolder.uri.fsPath,
  });

  if (multiSelect) {
    const result = await VscodeHelper.showQuickPickItems(items, {
      placeHolder: label,
      canPickMany: true,
      ignoreFocusOut: true,
      matchOnDescription: true,
    });
    if (!result || result.length === 0) return undefined;
    return result
      .filter((item) => item.description)
      .map((item) => item.description as string)
      .join('\n');
  }

  const result = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: label,
    canPickMany: false,
    ignoreFocusOut: true,
    matchOnDescription: true,
  });
  return result?.description;
}

export type InputValue = string | number | boolean | string[];
type InputValues = Record<string, string>;
type FileInput = Extract<DevPanelInput, { type: InputType.File }>;
type FolderInput = Extract<DevPanelInput, { type: InputType.Folder }>;
type TextInput = Extract<DevPanelInput, { type: InputType.Text }>;
type NumberInput = Extract<DevPanelInput, { type: InputType.Number }>;
type BooleanInput = Extract<DevPanelInput, { type: InputType.Boolean }>;
type ChoiceInput = Extract<DevPanelInput, { type: InputType.Choice }>;

type CollectInputOptions = {
  currentValue?: InputValue;
  booleanMode?: 'prompt' | 'toggle';
  basePath?: string;
};

function getInputLabel(input: DevPanelInput): string {
  return input.label ?? input.description ?? input.name;
}

function serializeInputValue(value: InputValue): string {
  return Array.isArray(value) ? value.join('\n') : String(value);
}

export async function collectInputs(
  inputs: DevPanelInput[],
  workspaceFolder: WorkspaceFolder | null,
): Promise<InputValues | null> {
  const values: InputValues = {};

  for (const input of inputs) {
    const value = await collectInputValue(input, workspaceFolder);
    if (value === undefined) return null;
    values[input.name] = serializeInputValue(value);
  }

  return values;
}

export async function collectInputValue(
  input: DevPanelInput,
  workspaceFolder: WorkspaceFolder | null,
  options: CollectInputOptions = {},
): Promise<InputValue | undefined> {
  switch (input.type) {
    case InputType.File:
      return collectFileInput(input, workspaceFolder, options.basePath);
    case InputType.Folder:
      return collectFolderInput(input, workspaceFolder, options.basePath);
    case InputType.Text:
      return collectTextInput(input, options.currentValue);
    case InputType.Number:
      return collectNumberInput(input, options.currentValue);
    case InputType.Boolean:
      return collectBooleanInput(input, options.currentValue, options.booleanMode ?? 'prompt');
    case InputType.Choice:
      return collectChoiceInput(input, options.currentValue);
  }
}

async function collectFileInput(
  input: FileInput,
  workspaceFolder: WorkspaceFolder | null,
  basePath?: string,
): Promise<InputValue | undefined> {
  const folder = workspaceFolder ?? VscodeHelper.getActiveWorkspaceFolder();
  if (!folder) {
    void VscodeHelper.showToastMessage(ToastKind.Error, ERROR_MSG_WORKSPACE_REQUIRED);
    return undefined;
  }

  const result = await selectFiles(folder, {
    label: getInputLabel(input),
    multiSelect: input.multiSelect ?? false,
    includes: replaceVariablesInPatterns(input.includes, folder),
    excludes: replaceVariablesInPatterns(input.excludes, folder),
    basePath,
  });
  if (!result) return undefined;
  return input.multiSelect ? result.split('\n') : result;
}

async function collectFolderInput(
  input: FolderInput,
  workspaceFolder: WorkspaceFolder | null,
  basePath?: string,
): Promise<InputValue | undefined> {
  const folder = workspaceFolder ?? VscodeHelper.getActiveWorkspaceFolder();
  if (!folder) {
    void VscodeHelper.showToastMessage(ToastKind.Error, ERROR_MSG_WORKSPACE_REQUIRED);
    return undefined;
  }

  const result = await selectFolders(folder, {
    label: getInputLabel(input),
    multiSelect: input.multiSelect ?? false,
    includes: replaceVariablesInPatterns(input.includes, folder),
    excludes: replaceVariablesInPatterns(input.excludes, folder),
    basePath,
  });
  if (!result) return undefined;
  return input.multiSelect ? result.split('\n') : result;
}

async function collectTextInput(input: TextInput, currentValue?: InputValue): Promise<string | undefined> {
  const value = typeof currentValue === 'string' ? currentValue : input.default;
  return VscodeHelper.showInputBox({
    prompt: getInputLabel(input),
    value: value ?? '',
    placeHolder: input.placeholder,
    ignoreFocusOut: true,
  });
}

async function collectNumberInput(input: NumberInput, currentValue?: InputValue): Promise<number | undefined> {
  const value = typeof currentValue === 'number' ? currentValue : input.default;
  const result = await VscodeHelper.showInputBox({
    prompt: getInputLabel(input),
    value: value === undefined ? '' : String(value),
    placeHolder: input.placeholder,
    ignoreFocusOut: true,
    validateInput: (inputValue: string) => {
      if (inputValue && Number.isNaN(Number(inputValue))) return ERROR_MSG_INVALID_NUMBER;
      return null;
    },
  });
  if (result === undefined) return undefined;
  return Number(result);
}

async function collectBooleanInput(
  input: BooleanInput,
  currentValue: InputValue | undefined,
  mode: 'prompt' | 'toggle',
): Promise<boolean | undefined> {
  const current = typeof currentValue === 'boolean' ? currentValue : (input.default ?? false);
  if (mode === 'toggle') return !current;

  const result = await VscodeHelper.showQuickPick(CONFIRM_OPTIONS, {
    placeHolder: getInputLabel(input),
    ignoreFocusOut: true,
  });
  if (!result) return undefined;
  return result === CONFIRM_YES;
}

async function collectChoiceInput(
  input: ChoiceInput,
  currentValue?: InputValue,
): Promise<string | string[] | undefined> {
  if (input.multiSelect) {
    const selectedValues = Array.isArray(currentValue) ? currentValue : (input.default ?? []);
    const result = await VscodeHelper.showQuickPickItems(
      input.options.map((option) => ({ label: option, picked: selectedValues.includes(option) })),
      { placeHolder: getInputLabel(input), canPickMany: true, ignoreFocusOut: true },
    );
    if (!result || result.length === 0) return undefined;
    return result.map((item) => item.label);
  }

  return VscodeHelper.showQuickPick(input.options, {
    placeHolder: getInputLabel(input),
    canPickMany: false,
    ignoreFocusOut: true,
  });
}

export function replaceInputPlaceholders(content: string, values: InputValues): string {
  let result = content;
  for (const [name, value] of Object.entries(values)) {
    result = result.replace(createVariablePlaceholderPattern(name), value);
  }
  return result;
}
