import * as path from 'node:path';
import * as vscode from 'vscode';

export function detectEditor(): string {
  if (vscode.env.appName.includes('Cursor')) return 'Cursor';
  if (vscode.env.appName.includes('Windsurf')) return 'Windsurf';
  return 'Code';
}

export function getVSCodeKeybindingsPath(): string {
  const editorName = detectEditor();
  return path.join(process.env.HOME ?? '', '.config', editorName, 'User', 'keybindings.json');
}
