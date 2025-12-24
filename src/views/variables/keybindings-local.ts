import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { CONTEXT_PREFIX, getVariableCommandId, getVariableCommandPrefix } from '../../common/constants';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { getVSCodeKeybindingsPath } from '../../common/lib/vscode-keybindings-utils';
import { Command, executeCommand, getWorkspaceId } from '../../common/lib/vscode-utils';
import { forEachWorkspaceConfig } from '../../common/utils/config-loader';

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

export function registerVariableKeybindings(context: vscode.ExtensionContext): void {
  forEachWorkspaceConfig((_folder, config) => {
    const variables = config.variables ?? [];

    for (const variable of variables) {
      const commandId = getVariableCommandId(variable.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.SelectConfigOption, variable);
      });
      context.subscriptions.push(disposable);
    }
  });
  syncKeybindings();
}
