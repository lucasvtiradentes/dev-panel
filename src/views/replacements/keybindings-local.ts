import * as fs from 'node:fs';
import JSON5 from 'json5';
import { CONTEXT_PREFIX, getReplacementCommandId, getReplacementCommandPrefix, getWorkspaceId } from '../../common';
import { getVSCodeKeybindingsPath } from '../../lib/vscode-keybindings-utils';

type VSCodeKeybinding = { key: string; command: string; when?: string };

function readVSCodeKeybindings(): VSCodeKeybinding[] {
  const filePath = getVSCodeKeybindingsPath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.trim() ? JSON5.parse(content) : [];
  } catch {
    return [];
  }
}

function matchesWorkspace(kb: VSCodeKeybinding): boolean {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) return !kb.when;
  return kb.when?.includes(`${CONTEXT_PREFIX}.workspaceId == '${workspaceId}'`) ?? false;
}

export function getReplacementKeybinding(replacementName: string): string | undefined {
  const keybindings = readVSCodeKeybindings();
  const commandId = getReplacementCommandId(replacementName);
  const binding = keybindings.find((kb) => kb.command === commandId && matchesWorkspace(kb));
  return binding?.key;
}

export function getAllReplacementKeybindings(): Record<string, string> {
  const keybindings = readVSCodeKeybindings();
  const replacementKeybindings: Record<string, string> = {};
  const commandPrefix = getReplacementCommandPrefix();

  for (const kb of keybindings) {
    if (kb.command.startsWith(`${commandPrefix}.`) && matchesWorkspace(kb)) {
      const replacementName = kb.command.replace(`${commandPrefix}.`, '');
      replacementKeybindings[replacementName] = kb.key;
    }
  }

  return replacementKeybindings;
}
