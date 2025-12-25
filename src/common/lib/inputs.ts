import * as vscode from 'vscode';
import { DEFAULT_EXCLUDES, DEFAULT_INCLUDES } from '../constants';
import {
  CONFIRM_OPTIONS,
  CONFIRM_YES,
  ERROR_MSG_INVALID_NUMBER,
  ERROR_MSG_WORKSPACE_REQUIRED,
} from '../constants/scripts-constants';
import { type DevPanelInput, type DevPanelSettings, PromptInputType } from '../schemas';
import { getFirstWorkspaceFolder } from '../utils/workspace-utils';
import { type FileSelectionOptions, selectFiles, selectFolders } from './file-selection';
import { createLogger } from './logger';

const log = createLogger('inputs');

type InputValues = Record<string, string>;

export async function collectInputs(
  inputs: DevPanelInput[],
  workspaceFolder: vscode.WorkspaceFolder | null,
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
  workspaceFolder: vscode.WorkspaceFolder | null,
  settings?: DevPanelSettings,
): Promise<string | undefined> {
  switch (input.type) {
    case PromptInputType.File:
      return collectFileInput(input, workspaceFolder, input.multiSelect ?? false, settings);
    case PromptInputType.Folder:
      return collectFolderInput(input, workspaceFolder, input.multiSelect ?? false, settings);
    case PromptInputType.Text:
      return collectTextInput(input);
    case PromptInputType.Number:
      return collectNumberInput(input);
    case PromptInputType.Confirm:
      return collectConfirmInput(input);
    case PromptInputType.Choice:
      return collectChoiceInput(input, false);
    case PromptInputType.Multichoice:
      return collectChoiceInput(input, true);
    default:
      return undefined;
  }
}

function getIncludePatterns(input: DevPanelInput, settings: DevPanelSettings | undefined): string[] {
  const defaultIncludes = [...DEFAULT_INCLUDES];

  if (input.includes && input.includes.length > 0) {
    log.debug(`Using input.includes merged with defaults: ${JSON.stringify([...defaultIncludes, ...input.includes])}`);
    return [...defaultIncludes, ...input.includes];
  }

  if (settings?.include && settings.include.length > 0) {
    const merged = [...defaultIncludes, ...settings.include];
    log.debug(`Using settings.include merged with defaults: ${JSON.stringify(merged)}`);
    return merged;
  }

  log.debug(`Using default includes: ${JSON.stringify(defaultIncludes)}`);
  return defaultIncludes;
}

function getExcludePatterns(input: DevPanelInput, settings: DevPanelSettings | undefined): string[] {
  const defaultExcludes = [...DEFAULT_EXCLUDES];

  if (input.excludes && input.excludes.length > 0) {
    log.debug(`Using input.excludes merged with defaults: ${JSON.stringify([...defaultExcludes, ...input.excludes])}`);
    return [...defaultExcludes, ...input.excludes];
  }

  if (settings?.exclude && settings.exclude.length > 0) {
    const merged = [...defaultExcludes, ...settings.exclude];
    log.debug(`Using settings.exclude merged with defaults: ${JSON.stringify(merged)}`);
    return merged;
  }

  log.debug(`Using default excludes: ${JSON.stringify(defaultExcludes)}`);
  return defaultExcludes;
}

async function collectFileInput(
  input: DevPanelInput,
  workspaceFolder: vscode.WorkspaceFolder | null,
  multiple: boolean,
  settings?: DevPanelSettings,
): Promise<string | undefined> {
  log.info(`collectFileInput called - multiple: ${multiple}`);
  log.debug(`input: ${JSON.stringify(input)}`);

  const folder = workspaceFolder ?? getFirstWorkspaceFolder();
  if (!folder) {
    void vscode.window.showErrorMessage(ERROR_MSG_WORKSPACE_REQUIRED);
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
  workspaceFolder: vscode.WorkspaceFolder | null,
  multiple: boolean,
  settings?: DevPanelSettings,
): Promise<string | undefined> {
  const folder = workspaceFolder ?? getFirstWorkspaceFolder();
  if (!folder) {
    void vscode.window.showErrorMessage(ERROR_MSG_WORKSPACE_REQUIRED);
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
  return vscode.window.showInputBox({
    prompt: input.label,
    placeHolder: input.placeholder,
    ignoreFocusOut: true,
  });
}

async function collectNumberInput(input: DevPanelInput): Promise<string | undefined> {
  return vscode.window.showInputBox({
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
  const result = await vscode.window.showQuickPick(CONFIRM_OPTIONS, {
    placeHolder: input.label,
    ignoreFocusOut: true,
  });
  if (!result) return undefined;
  return result === CONFIRM_YES ? 'true' : 'false';
}

async function collectChoiceInput(input: DevPanelInput, multiple: boolean): Promise<string | undefined> {
  if (!input.options || input.options.length === 0) return undefined;

  if (multiple) {
    const result = await vscode.window.showQuickPick(input.options, {
      placeHolder: input.label,
      canPickMany: true,
      ignoreFocusOut: true,
    });
    if (!result || result.length === 0) return undefined;
    return result.join('\n');
  }

  return vscode.window.showQuickPick(input.options, {
    placeHolder: input.label,
    canPickMany: false,
    ignoreFocusOut: true,
  });
}

export function replaceInputPlaceholders(content: string, values: InputValues): string {
  let result = content;
  for (const [name, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\$${name}`, 'g'), value);
  }
  return result;
}
