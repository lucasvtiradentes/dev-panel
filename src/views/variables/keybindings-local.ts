import * as fs from 'node:fs';
import JSON5 from 'json5';
import { CONTEXT_PREFIX, getVariableCommandId, getVariableCommandPrefix } from '../../common/constants';
import { getVSCodeKeybindingsPath } from '../../common/lib/vscode-keybindings-utils';
import { getWorkspaceId } from '../../common/lib/vscode-utils';

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

export function getVariableKeybinding(variableName: string): string | undefined {
  const keybindings = readVSCodeKeybindings();
  const commandId = getVariableCommandId(variableName);
  const binding = keybindings.find((kb) => kb.command === commandId && matchesWorkspace(kb));
  return binding?.key;
}

export function getAllVariableKeybindings(): Record<string, string> {
  const keybindings = readVSCodeKeybindings();
  const variableKeybindings: Record<string, string> = {};
  const commandPrefix = getVariableCommandPrefix();

  for (const kb of keybindings) {
    if (kb.command.startsWith(`${commandPrefix}.`) && matchesWorkspace(kb)) {
      const variableName = kb.command.replace(`${commandPrefix}.`, '');
      variableKeybindings[variableName] = kb.key;
    }
  }

  return variableKeybindings;
}
