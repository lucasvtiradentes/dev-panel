import * as vscode from 'vscode';
import { EDITOR_NAMES, KEYBINDINGS_FILE, USER_CONFIG_DIR, USER_SETTINGS_DIR } from '../constants';
import { type Keybinding, KeybindingsHelper } from '../utils/helpers/keybindings-helper';
import { NodeOsHelper, NodePathHelper } from '../utils/helpers/node-helper';

export type VSCodeKeybinding = Keybinding;

function detectEditor(): string {
  if (vscode.env.appName.includes(EDITOR_NAMES.CURSOR)) return EDITOR_NAMES.CURSOR;
  if (vscode.env.appName.includes(EDITOR_NAMES.WINDSURF)) return EDITOR_NAMES.WINDSURF;
  return EDITOR_NAMES.CODE;
}

export function getVSCodeKeybindingsPath(): string {
  const editorName = detectEditor();
  return NodePathHelper.join(NodeOsHelper.homedir(), USER_CONFIG_DIR, editorName, USER_SETTINGS_DIR, KEYBINDINGS_FILE);
}

export function loadKeybindings(): VSCodeKeybinding[] {
  const keybindingsPath = getVSCodeKeybindingsPath();
  return KeybindingsHelper.load(keybindingsPath);
}
