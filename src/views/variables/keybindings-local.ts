import * as fs from 'node:fs';
import JSON5 from 'json5';
import { getVariableCommandId, getVariableCommandPrefix } from '../../common';
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

export function getVariableKeybinding(variableName: string): string | undefined {
  const keybindings = readVSCodeKeybindings();
  const commandId = getVariableCommandId(variableName);

  const binding = keybindings.find((kb) => kb.command === commandId);
  return binding?.key;
}

export function getAllVariableKeybindings(): Record<string, string> {
  const keybindings = readVSCodeKeybindings();
  const variableKeybindings: Record<string, string> = {};
  const commandPrefix = getVariableCommandPrefix();

  for (const kb of keybindings) {
    if (kb.command.startsWith(`${commandPrefix}.`)) {
      const variableName = kb.command.replace(`${commandPrefix}.`, '');
      variableKeybindings[variableName] = kb.key;
    }
  }

  return variableKeybindings;
}
