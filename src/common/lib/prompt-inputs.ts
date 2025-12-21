import * as vscode from 'vscode';
import { DEFAULT_EXCLUDES } from '../constants';
import { type PPPromptInput, type PPSettings, PromptInputType, SelectionStyle } from '../schemas';
import { type FileSelectionOptions, selectFiles, selectFolders } from './file-selection';
import { createLogger } from './logger';

const log = createLogger('prompt-inputs');

type PromptInputValues = Record<string, string>;

export async function collectPromptInputs(
  inputs: PPPromptInput[],
  workspaceFolder: vscode.WorkspaceFolder,
  settings?: PPSettings,
): Promise<PromptInputValues | null> {
  const values: PromptInputValues = {};

  for (const input of inputs) {
    const value = await collectSingleInput(input, workspaceFolder, settings);
    if (value === undefined) return null;
    values[input.name] = value;
  }

  return values;
}

async function collectSingleInput(
  input: PPPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  settings?: PPSettings,
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

function getSelectionStyle(
  input: PPPromptInput,
  settings: PPSettings | undefined,
  inputType: 'file' | 'folder',
): SelectionStyle {
  log.debug(`getSelectionStyle called - inputType: ${inputType}`);
  log.debug(`input.selectionStyle: ${input.selectionStyle}`);
  log.debug(`settings: ${JSON.stringify(settings)}`);

  if (input.selectionStyle) {
    log.debug(`Using input.selectionStyle: ${input.selectionStyle}`);
    return input.selectionStyle;
  }

  const promptSelection = settings?.promptSelection;
  if (inputType === 'folder' && promptSelection?.folderStyle) {
    log.debug(`Using settings.promptSelection.folderStyle: ${promptSelection.folderStyle}`);
    return promptSelection.folderStyle;
  }
  if (inputType === 'file' && promptSelection?.fileStyle) {
    log.debug(`Using settings.promptSelection.fileStyle: ${promptSelection.fileStyle}`);
    return promptSelection.fileStyle;
  }

  log.debug('Using default: flat');
  return SelectionStyle.Flat;
}

function getExcludePatterns(input: PPPromptInput, settings: PPSettings | undefined): string[] {
  if (input.excludes && input.excludes.length > 0) {
    log.debug(`Using input.excludes: ${JSON.stringify(input.excludes)}`);
    return input.excludes;
  }
  if (settings?.promptSelection?.excludes && settings.promptSelection.excludes.length > 0) {
    log.debug(`Using settings.promptSelection.excludes: ${JSON.stringify(settings.promptSelection.excludes)}`);
    return settings.promptSelection.excludes;
  }
  log.debug(`Using default excludes: ${JSON.stringify(DEFAULT_EXCLUDES)}`);
  return DEFAULT_EXCLUDES;
}

async function collectFileInput(
  input: PPPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  multiple: boolean,
  settings?: PPSettings,
): Promise<string | undefined> {
  log.info(`collectFileInput called - multiple: ${multiple}`);
  log.debug(`input: ${JSON.stringify(input)}`);
  const style = getSelectionStyle(input, settings, 'file');
  const excludes = getExcludePatterns(input, settings);
  log.info(`Resolved style: ${style}, excludes: ${excludes.length} patterns`);

  const options: FileSelectionOptions = {
    label: input.label,
    multiSelect: multiple,
    selectionStyle: style,
    excludes,
  };

  return selectFiles(workspaceFolder, options);
}

async function collectFolderInput(
  input: PPPromptInput,
  workspaceFolder: vscode.WorkspaceFolder,
  multiple: boolean,
  settings?: PPSettings,
): Promise<string | undefined> {
  const style = getSelectionStyle(input, settings, 'folder');
  const excludes = getExcludePatterns(input, settings);

  const options: FileSelectionOptions = {
    label: input.label,
    multiSelect: multiple,
    selectionStyle: style,
    excludes,
  };

  return selectFolders(workspaceFolder, options);
}

async function collectTextInput(input: PPPromptInput): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: input.label,
    placeHolder: input.placeholder,
    ignoreFocusOut: true,
  });
}

async function collectNumberInput(input: PPPromptInput): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: input.label,
    placeHolder: input.placeholder,
    ignoreFocusOut: true,
    validateInput: (value: string) => {
      if (value && Number.isNaN(Number(value))) {
        return 'Please enter a valid number';
      }
      return null;
    },
  });
}

async function collectConfirmInput(input: PPPromptInput): Promise<string | undefined> {
  const result = await vscode.window.showQuickPick(['Yes', 'No'], {
    placeHolder: input.label,
    ignoreFocusOut: true,
  });
  if (!result) return undefined;
  return result === 'Yes' ? 'true' : 'false';
}

async function collectChoiceInput(input: PPPromptInput, multiple: boolean): Promise<string | undefined> {
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

export function replaceInputPlaceholders(content: string, values: PromptInputValues): string {
  let result = content;
  for (const [name, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value);
  }
  return result;
}
