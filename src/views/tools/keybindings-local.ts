import * as fs from 'node:fs';
import JSON5 from 'json5';
import { getToolCommandId, getToolCommandPrefix } from '../../common';
import { getVSCodeKeybindingsPath } from '../../lib/vscode-keybindings-utils';

type VSCodeKeybinding = {
  key: string;
  command: string;
  when?: string;
};

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

export function getToolKeybinding(toolName: string): string | undefined {
  const keybindings = readVSCodeKeybindings();
  const commandId = getToolCommandId(toolName);

  const binding = keybindings.find((kb) => kb.command === commandId);
  return binding?.key;
}

export function getAllKeybindings(): Record<string, string> {
  const keybindings = readVSCodeKeybindings();
  const toolKeybindings: Record<string, string> = {};
  const commandPrefix = getToolCommandPrefix();

  for (const kb of keybindings) {
    if (kb.command.startsWith(`${commandPrefix}.`)) {
      const toolName = kb.command.replace(`${commandPrefix}.`, '');
      toolKeybindings[toolName] = kb.key;
    }
  }

  return toolKeybindings;
}
