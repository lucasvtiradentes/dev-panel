import * as fs from 'node:fs';
import JSON5 from 'json5';
import { getTaskCommandId, getTaskCommandPrefix, getWorkspaceId } from '../../common';
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
  return kb.when?.includes(`projectPanel.workspaceId == '${workspaceId}'`) ?? false;
}

export function getTaskKeybinding(taskName: string): string | undefined {
  const keybindings = readVSCodeKeybindings();
  const commandId = getTaskCommandId(taskName);
  const binding = keybindings.find((kb) => kb.command === commandId && matchesWorkspace(kb));
  return binding?.key;
}

export function getAllTaskKeybindings(): Record<string, string> {
  const keybindings = readVSCodeKeybindings();
  const taskKeybindings: Record<string, string> = {};
  const commandPrefix = getTaskCommandPrefix();

  for (const kb of keybindings) {
    if (kb.command.startsWith(`${commandPrefix}.`) && matchesWorkspace(kb)) {
      const taskName = kb.command.replace(`${commandPrefix}.`, '');
      taskKeybindings[taskName] = kb.key;
    }
  }

  return taskKeybindings;
}
