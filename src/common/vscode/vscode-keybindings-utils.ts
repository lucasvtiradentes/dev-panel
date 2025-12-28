import JSON5 from 'json5';
import * as vscode from 'vscode';
import { EDITOR_NAMES, KEYBINDINGS_FILE, USER_CONFIG_DIR, USER_SETTINGS_DIR } from '../constants';
import { FileIOHelper } from '../utils/helpers/node-helper';
import { NodePathHelper } from '../utils/helpers/node-helper';

export type VSCodeKeybinding = { key: string; command: string; when?: string };

function detectEditor(): string {
  if (vscode.env.appName.includes(EDITOR_NAMES.CURSOR)) return EDITOR_NAMES.CURSOR;
  if (vscode.env.appName.includes(EDITOR_NAMES.WINDSURF)) return EDITOR_NAMES.WINDSURF;
  return EDITOR_NAMES.CODE;
}

export function getVSCodeKeybindingsPath(): string {
  const editorName = detectEditor();
  return NodePathHelper.join(process.env.HOME ?? '', USER_CONFIG_DIR, editorName, USER_SETTINGS_DIR, KEYBINDINGS_FILE);
}

export function parseKeybindings(content: string): VSCodeKeybinding[] {
  try {
    return content.trim() ? JSON5.parse(content) : [];
  } catch {
    return [];
  }
}

export function loadKeybindings(): VSCodeKeybinding[] {
  const keybindingsPath = getVSCodeKeybindingsPath();
  if (!FileIOHelper.fileExists(keybindingsPath)) return [];
  try {
    const content = FileIOHelper.readFile(keybindingsPath);
    return parseKeybindings(content);
  } catch {
    return [];
  }
}
