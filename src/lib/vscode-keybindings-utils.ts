import * as path from 'node:path';
import * as vscode from 'vscode';
import { EDITOR_NAMES, KEYBINDINGS_FILE, USER_CONFIG_DIR, USER_SETTINGS_DIR } from '../common/constants';

export function detectEditor(): string {
  if (vscode.env.appName.includes(EDITOR_NAMES.CURSOR)) return EDITOR_NAMES.CURSOR;
  if (vscode.env.appName.includes(EDITOR_NAMES.WINDSURF)) return EDITOR_NAMES.WINDSURF;
  return EDITOR_NAMES.CODE;
}

export function getVSCodeKeybindingsPath(): string {
  const editorName = detectEditor();
  return path.join(process.env.HOME ?? '', USER_CONFIG_DIR, editorName, USER_SETTINGS_DIR, KEYBINDINGS_FILE);
}
