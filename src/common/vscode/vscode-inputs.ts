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

function resolvePatternWithParentRefs(
  basePath: string,
  pattern: string,
): { resolvedBase: string; resolvedPattern: string } {
  let currentBase = basePath;
  let currentPattern = pattern;

  while (currentPattern.startsWith('../')) {
    currentBase = path.dirname(currentBase);
    currentPattern = currentPattern.slice(3);
  }

  return { resolvedBase: currentBase, resolvedPattern: currentPattern };
}

function resolveIncludesWithParentRefs(
  basePath: string,
  patterns: string[],
): { resolvedBase: string; resolvedPatterns: string[] } {
  if (patterns.length === 0) return { resolvedBase: basePath, resolvedPatterns: patterns };

  const firstResult = resolvePatternWithParentRefs(basePath, patterns[0]);
  const resolvedPatterns = [firstResult.resolvedPattern];

  for (let i = 1; i < patterns.length; i++) {
    const result = resolvePatternWithParentRefs(basePath, patterns[i]);
    resolvedPatterns.push(result.resolvedPattern);
  }

  return { resolvedBase: firstResult.resolvedBase, resolvedPatterns };
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
  const { resolvedBase, resolvedPatterns } = resolveIncludesWithParentRefs(initialBase, includes);
  log.info(`selectFilesFlat - searchBase: ${resolvedBase}`);
  const includeGlob = buildGlob(resolvedPatterns);
  const excludeGlob = buildGlob(excludes);
  const files = await VscodeHelper.findFiles(
    VscodeHelper.createRelativePattern(resolvedBase, includeGlob),
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
  const { resolvedBase, resolvedPatterns } = resolveIncludesWithParentRefs(initialBase, includes);
  const includeGlob = buildGlob(resolvedPatterns);
  const excludeGlob = buildGlob(excludes);
  const files = await VscodeHelper.findFiles(
    VscodeHelper.createRelativePattern(resolvedBase, includeGlob),
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
  basePath?: string,
): Promise<InputValues | null> {
  const values: InputValues = {};

  for (const input of inputs) {
    const value = await collectSingleInput(input, workspaceFolder, basePath);
    if (value === undefined) return null;
    values[input.name] = value;
  }

  return values;
}

async function collectSingleInput(
  input: DevPanelInput,
  workspaceFolder: WorkspaceFolder | null,
  basePath?: string,
): Promise<string | undefined> {
  switch (input.type) {
    case InputType.File:
      return collectFileInput(input, workspaceFolder, input.multiSelect ?? false, basePath);
    case InputType.Folder:
      return collectFolderInput(input, workspaceFolder, input.multiSelect ?? false, basePath);
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

async function collectFileInput(
  input: DevPanelInput,
  workspaceFolder: WorkspaceFolder | null,
  multiple: boolean,
  basePath?: string,
): Promise<string | undefined> {
  log.info(`collectFileInput called - multiple: ${multiple}, basePath: ${basePath ?? 'workspace'}`);

  const folder = workspaceFolder ?? VscodeHelper.getFirstWorkspaceFolder();
  if (!folder) {
    void VscodeHelper.showToastMessage(ToastKind.Error, ERROR_MSG_WORKSPACE_REQUIRED);
    return undefined;
  }

  const options: FileSelectionOptions = {
    label: input.label,
    multiSelect: multiple,
    includes: replaceVariablesInPatterns(input.includes, folder),
    excludes: replaceVariablesInPatterns(input.excludes, folder),
    basePath,
  };

  return selectFiles(folder, options);
}

async function collectFolderInput(
  input: DevPanelInput,
  workspaceFolder: WorkspaceFolder | null,
  multiple: boolean,
  basePath?: string,
): Promise<string | undefined> {
  const folder = workspaceFolder ?? VscodeHelper.getFirstWorkspaceFolder();
  if (!folder) {
    void VscodeHelper.showToastMessage(ToastKind.Error, ERROR_MSG_WORKSPACE_REQUIRED);
    return undefined;
  }

  const options: FileSelectionOptions = {
    label: input.label,
    multiSelect: multiple,
    includes: replaceVariablesInPatterns(input.includes, folder),
    excludes: replaceVariablesInPatterns(input.excludes, folder),
    basePath,
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
