import * as vscode from 'vscode';
import { CONTEXT_PREFIX, getVariableCommandId, getVariableCommandPrefix } from '../../common/constants';
import { forEachWorkspaceConfig, loadGlobalConfig } from '../../common/lib/config-manager';
import { syncKeybindings } from '../../common/lib/keybindings-sync';
import { type VSCodeKeybinding, loadKeybindings } from '../../common/lib/vscode-keybindings-utils';
import { Command, executeCommand, getWorkspaceId } from '../../common/lib/vscode-utils';

function matchesWorkspace(kb: VSCodeKeybinding): boolean {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) return !kb.when;
  return kb.when?.includes(`${CONTEXT_PREFIX}.workspaceId == '${workspaceId}'`) ?? false;
}

export function getVariableKeybinding(variableName: string): string | undefined {
  const keybindings = loadKeybindings();
  const commandId = getVariableCommandId(variableName);
  const binding = keybindings.find((kb) => kb.command === commandId && matchesWorkspace(kb));
  return binding?.key;
}

export function getAllVariableKeybindings(): Record<string, string> {
  const keybindings = loadKeybindings();
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

  const globalConfig = loadGlobalConfig();
  if (globalConfig) {
    const globalVariables = globalConfig.variables ?? [];

    for (const variable of globalVariables) {
      const commandId = getVariableCommandId(variable.name);
      const disposable = vscode.commands.registerCommand(commandId, () => {
        void executeCommand(Command.SelectConfigOption, variable);
      });
      context.subscriptions.push(disposable);
    }
  }

  syncKeybindings();
}
