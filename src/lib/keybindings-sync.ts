import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { getToolCommandId } from '../common';
import { getAllKeybindings } from '../views/tools/keybindings-local';
import { getVSCodeKeybindingsPath } from './vscode-keybindings-utils';

export function syncKeybindings(): void {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders || folders.length === 0) return;

  const localKeybindings = getAllKeybindings();
  const keybindingsToAdd: Array<{ command: string; key: string }> = [];

  for (const [toolName, keybinding] of Object.entries(localKeybindings)) {
    keybindingsToAdd.push({
      command: getToolCommandId(toolName),
      key: keybinding,
    });
  }

  if (keybindingsToAdd.length === 0) return;

  const keybindingsPath = getVSCodeKeybindingsPath();
  let existingKeybindings: Array<{ command: string; key: string }> = [];

  if (fs.existsSync(keybindingsPath)) {
    try {
      const content = fs.readFileSync(keybindingsPath, 'utf8');
      existingKeybindings = content.trim() ? JSON5.parse(content) : [];
    } catch {
      existingKeybindings = [];
    }
  }

  const commandsToUpdate = new Set(keybindingsToAdd.map((k) => k.command));
  const filtered = existingKeybindings.filter((k) => !commandsToUpdate.has(k.command));
  const updated = [...filtered, ...keybindingsToAdd];

  try {
    fs.writeFileSync(keybindingsPath, JSON.stringify(updated, null, 2), 'utf8');
  } catch {
    // Silent fail
  }
}
