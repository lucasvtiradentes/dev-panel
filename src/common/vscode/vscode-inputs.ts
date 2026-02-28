import { DEFAULT_EXCLUDES, DEFAULT_INCLUDES, ROOT_FOLDER_LABEL, createVariablePlaceholderPattern } from '../constants';
import { createLogger } from '../lib/logger';
import { type DevPanelInput, type DevPanelSettings, InputType } from '../schemas';
import { JsonHelper } from '../utils/helpers/json-helper';
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
};

type InternalSelectionOptions = {
  workspaceFolder: WorkspaceFolder;
  label: string;
  multiSelect: boolean;
  includes: string[];
  excludes: string[];
};

function buildGlob(patterns: string[]): string {
  if (patterns.length === 1) return patterns[0];
  return `{${patterns.join(',')}}`;
}

export async function selectFiles(
  workspaceFolder: WorkspaceFolder,
  options: FileSelectionOptions,
): Promise<string | undefined> {
  const includes = options.includes ?? DEFAULT_INCLUDES;
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  log.info(`selectFiles - multiSelect: ${options.multiSelect ?? false}`);
  return selectFilesFlat({
    workspaceFolder,
    label: options.label,
    multiSelect: options.multiSelect ?? false,
    includes,
    excludes,
  });
}

async function selectFilesFlat(opts: InternalSelectionOptions): Promise<string | undefined> {
  const { workspaceFolder, label, multiSelect, includes, excludes } = opts;
  log.info(`selectFilesFlat - workspaceFolder.name: ${workspaceFolder.name}`);
  log.info(`selectFilesFlat - workspaceFolder.uri.fsPath: ${workspaceFolder.uri.fsPath}`);
  const includeGlob = buildGlob(includes);
  const excludeGlob = buildGlob(excludes);
  const files = await VscodeHelper.findFiles(
    VscodeHelper.createRelativePattern(workspaceFolder, includeGlob),
    excludeGlob,
  );
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
  const includes = options.includes ?? DEFAULT_INCLUDES;
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  log.info(`selectFolders - multiSelect: ${options.multiSelect ?? false}`);
  return selectFoldersFlat({
    workspaceFolder,
    label: options.label,
    multiSelect: options.multiSelect ?? false,
    includes,
    excludes,
  });
}

async function selectFoldersFlat(opts: InternalSelectionOptions): Promise<string | undefined> {
  const { workspaceFolder, label, multiSelect, includes, excludes } = opts;
  const includeGlob = buildGlob(includes);
  const excludeGlob = buildGlob(excludes);
  const files = await VscodeHelper.findFiles(
    VscodeHelper.createRelativePattern(workspaceFolder, includeGlob),
    excludeGlob,
  );

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

type InputValues = Record<string, string>;

export async function collectInputs(
  inputs: DevPanelInput[],
  workspaceFolder: WorkspaceFolder | null,
  settings?: DevPanelSettings,
): Promise<InputValues | null> {
  const values: InputValues = {};

  for (const input of inputs) {
    const value = await collectSingleInput(input, workspaceFolder, settings);
    if (value === undefined) return null;
    values[input.name] = value;
  }

  return values;
}

async function collectSingleInput(
  input: DevPanelInput,
  workspaceFolder: WorkspaceFolder | null,
  settings?: DevPanelSettings,
): Promise<string | undefined> {
  switch (input.type) {
    case InputType.File:
      return collectFileInput(input, workspaceFolder, input.multiSelect ?? false, settings);
    case InputType.Folder:
      return collectFolderInput(input, workspaceFolder, input.multiSelect ?? false, settings);
    case InputType.Text:
      return collectTextInput(input);
    case InputType.Number:
      return collectNumberInput(input);
    case InputType.Confirm:
      return collectConfirmInput(input);
    case InputType.Choice:
      return collectChoiceInput(input, false);
    case InputType.Multichoice:
      return collectChoiceInput(input, true);
    default:
      return undefined;
  }
}

function getIncludePatterns(input: DevPanelInput, settings: DevPanelSettings | undefined): string[] {
  const defaultIncludes = [...DEFAULT_INCLUDES];

  if (input.includes && input.includes.length > 0) {
    log.debug(
      `Using input.includes merged with defaults: ${JsonHelper.stringify([...defaultIncludes, ...input.includes])}`,
    );
    return [...defaultIncludes, ...input.includes];
  }

  if (settings?.include && settings.include.length > 0) {
    const merged = [...defaultIncludes, ...settings.include];
    log.debug(`Using settings.include merged with defaults: ${JsonHelper.stringify(merged)}`);
    return merged;
  }

  log.debug(`Using default includes: ${JsonHelper.stringify(defaultIncludes)}`);
  return defaultIncludes;
}

function getExcludePatterns(input: DevPanelInput, settings: DevPanelSettings | undefined): string[] {
  const defaultExcludes = [...DEFAULT_EXCLUDES];

  if (input.excludes && input.excludes.length > 0) {
    log.debug(
      `Using input.excludes merged with defaults: ${JsonHelper.stringify([...defaultExcludes, ...input.excludes])}`,
    );
    return [...defaultExcludes, ...input.excludes];
  }

  if (settings?.exclude && settings.exclude.length > 0) {
    const merged = [...defaultExcludes, ...settings.exclude];
    log.debug(`Using settings.exclude merged with defaults: ${JsonHelper.stringify(merged)}`);
    return merged;
  }

  log.debug(`Using default excludes: ${JsonHelper.stringify(defaultExcludes)}`);
  return defaultExcludes;
}

async function collectFileInput(
  input: DevPanelInput,
  workspaceFolder: WorkspaceFolder | null,
  multiple: boolean,
  settings?: DevPanelSettings,
): Promise<string | undefined> {
  log.info(`collectFileInput called - multiple: ${multiple}`);
  log.debug(`input: ${JsonHelper.stringify(input)}`);

  const folder = workspaceFolder ?? VscodeHelper.getFirstWorkspaceFolder();
  if (!folder) {
    void VscodeHelper.showToastMessage(ToastKind.Error, ERROR_MSG_WORKSPACE_REQUIRED);
    return undefined;
  }

  const includes = getIncludePatterns(input, settings);
  const excludes = getExcludePatterns(input, settings);
  log.info(`Resolved includes: ${includes.length} patterns, excludes: ${excludes.length} patterns`);

  const options: FileSelectionOptions = {
    label: input.label,
    multiSelect: multiple,
    includes,
    excludes,
  };

  return selectFiles(folder, options);
}

async function collectFolderInput(
  input: DevPanelInput,
  workspaceFolder: WorkspaceFolder | null,
  multiple: boolean,
  settings?: DevPanelSettings,
): Promise<string | undefined> {
  const folder = workspaceFolder ?? VscodeHelper.getFirstWorkspaceFolder();
  if (!folder) {
    void VscodeHelper.showToastMessage(ToastKind.Error, ERROR_MSG_WORKSPACE_REQUIRED);
    return undefined;
  }

  const includes = getIncludePatterns(input, settings);
  const excludes = getExcludePatterns(input, settings);

  const options: FileSelectionOptions = {
    label: input.label,
    multiSelect: multiple,
    includes,
    excludes,
  };

  return selectFolders(folder, options);
}

async function collectTextInput(input: DevPanelInput): Promise<string | undefined> {
  return VscodeHelper.showInputBox({
    prompt: input.label,
    placeHolder: input.placeholder,
    ignoreFocusOut: true,
  });
}

async function collectNumberInput(input: DevPanelInput): Promise<string | undefined> {
  return VscodeHelper.showInputBox({
    prompt: input.label,
    placeHolder: input.placeholder,
    ignoreFocusOut: true,
    validateInput: (value: string) => {
      if (value && Number.isNaN(Number(value))) {
        return ERROR_MSG_INVALID_NUMBER;
      }
      return null;
    },
  });
}

async function collectConfirmInput(input: DevPanelInput): Promise<string | undefined> {
  const result = await VscodeHelper.showQuickPick(CONFIRM_OPTIONS, {
    placeHolder: input.label,
    ignoreFocusOut: true,
  });
  if (!result) return undefined;
  return result === CONFIRM_YES ? 'true' : 'false';
}

async function collectChoiceInput(input: DevPanelInput, multiple: boolean): Promise<string | undefined> {
  if (!input.options || input.options.length === 0) return undefined;

  if (multiple) {
    const result = await VscodeHelper.showQuickPick(input.options, {
      placeHolder: input.label,
      canPickMany: true,
      ignoreFocusOut: true,
    });
    if (!result || result.length === 0) return undefined;
    return result.join('\n');
  }

  return VscodeHelper.showQuickPick(input.options, {
    placeHolder: input.label,
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
