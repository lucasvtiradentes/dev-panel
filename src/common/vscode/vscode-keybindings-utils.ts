import * as vscode from 'vscode';
import { EDITOR_NAMES, KEYBINDINGS_FILE, USER_SETTINGS_DIR } from '../constants';
import { type Keybinding, KeybindingsHelper } from '../utils/helpers/keybindings-helper';
import { NodeOsHelper, NodePathHelper } from '../utils/helpers/node-helper';

export type VSCodeKeybinding = Keybinding;

function detectEditor(): string {
  if (vscode.env.appName.includes(EDITOR_NAMES.CURSOR)) return EDITOR_NAMES.CURSOR;
  if (vscode.env.appName.includes(EDITOR_NAMES.WINDSURF)) return EDITOR_NAMES.WINDSURF;
  return EDITOR_NAMES.CODE;
}

function getVSCodeConfigDir(): string {
  const platform = NodeOsHelper.platform();
  const home = NodeOsHelper.homedir();
  const editorName = detectEditor();

  if (platform === 'darwin') {
    return NodePathHelper.join(home, 'Library', 'Application Support', editorName);
  }
  if (platform === 'win32') {
    return NodePathHelper.join(home, 'AppData', 'Roaming', editorName);
  }
  return NodePathHelper.join(home, '.config', editorName);
}

export function getVSCodeKeybindingsPath(): string {
  return NodePathHelper.join(getVSCodeConfigDir(), USER_SETTINGS_DIR, KEYBINDINGS_FILE);
}

export function loadKeybindings(): VSCodeKeybinding[] {
  const keybindingsPath = getVSCodeKeybindingsPath();
  return KeybindingsHelper.load(keybindingsPath);
}
