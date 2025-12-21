import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { getWorkspaceId } from '../common';
import { CONTEXT_PREFIX, KEYBINDINGS_FILE } from '../common/constants';
import { getVSCodeKeybindingsPath } from '../lib/vscode-keybindings-utils';

type KeybindingEntry = { key: string; command: string; when?: string };

let isUpdating = false;

function addWhenClauseToOurKeybindings(): void {
  if (isUpdating) return;

  const workspaceId = getWorkspaceId();
  if (!workspaceId) return;

  const keybindingsPath = getVSCodeKeybindingsPath();
  if (!fs.existsSync(keybindingsPath)) return;

  let keybindings: KeybindingEntry[];
  try {
    const content = fs.readFileSync(keybindingsPath, 'utf8');
    keybindings = content.trim() ? JSON5.parse(content) : [];
  } catch {
    return;
  }

  const expectedWhen = `${CONTEXT_PREFIX}.workspaceId == '${workspaceId}'`;
  let modified = false;

  for (const kb of keybindings) {
    if (!kb.command.startsWith(CONTEXT_PREFIX)) continue;
    if (kb.when === expectedWhen) continue;
    if (kb.when?.includes(`${CONTEXT_PREFIX}.workspaceId`)) continue;

    kb.when = expectedWhen;
    modified = true;
  }

  if (modified) {
    isUpdating = true;
    try {
      fs.writeFileSync(keybindingsPath, JSON.stringify(keybindings, null, 2), 'utf8');
    } finally {
      setTimeout(() => {
        isUpdating = false;
      }, 100);
    }
  }
}

export function createKeybindingsWatcher(onKeybindingsChange: () => void): vscode.Disposable {
  const keybindingsPath = getVSCodeKeybindingsPath();

  if (!fs.existsSync(keybindingsPath)) {
    return { dispose: () => {} };
  }

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(path.dirname(keybindingsPath), KEYBINDINGS_FILE),
  );

  const handleChange = () => {
    console.log('[keybindings-watcher] Keybindings file changed, updating and notifying');
    addWhenClauseToOurKeybindings();
    onKeybindingsChange();
  };

  watcher.onDidChange(handleChange);
  watcher.onDidCreate(handleChange);
  watcher.onDidDelete(() => onKeybindingsChange());

  return watcher;
}
