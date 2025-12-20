import * as fs from 'node:fs';
import JSON5 from 'json5';
import { getPromptCommandId, getPromptCommandPrefix } from '../../common';
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

export function getPromptKeybinding(promptName: string): string | undefined {
  const keybindings = readVSCodeKeybindings();
  const commandId = getPromptCommandId(promptName);

  const binding = keybindings.find((kb) => kb.command === commandId);
  return binding?.key;
}

export function getAllPromptKeybindings(): Record<string, string> {
  const keybindings = readVSCodeKeybindings();
  const promptKeybindings: Record<string, string> = {};
  const commandPrefix = getPromptCommandPrefix();

  for (const kb of keybindings) {
    if (kb.command.startsWith(`${commandPrefix}.`)) {
      const promptName = kb.command.replace(`${commandPrefix}.`, '');
      promptKeybindings[promptName] = kb.key;
    }
  }

  return promptKeybindings;
}
