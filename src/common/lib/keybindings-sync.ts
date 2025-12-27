import * as fs from 'node:fs';
import { getAllPromptKeybindings } from '../../views/prompts/keybindings-local';
import { getAllTaskKeybindings } from '../../views/tasks/keybindings-local';
import { getAllToolKeybindings } from '../../views/tools/keybindings-local';
import { getAllVariableKeybindings } from '../../views/variables/keybindings-local';
import { getPromptCommandId, getTaskCommandId, getToolCommandId, getVariableCommandId } from '../constants/functions';
import { VscodeHelper } from '../vscode/vscode-helper';
import { getVSCodeKeybindingsPath, loadKeybindings } from '../vscode/vscode-keybindings-utils';
import { Command, executeCommand } from '../vscode/vscode-utils';

export function syncKeybindings() {
  const folders = VscodeHelper.getWorkspaceFolders();
  if (folders.length === 0) return;

  const keybindingsToAdd: Array<{ command: string; key: string }> = [];

  const toolKeybindings = getAllToolKeybindings();
  for (const [toolName, keybinding] of Object.entries(toolKeybindings)) {
    keybindingsToAdd.push({
      command: getToolCommandId(toolName),
      key: keybinding as string,
    });
  }

  const promptKeybindings = getAllPromptKeybindings();
  for (const [promptName, keybinding] of Object.entries(promptKeybindings)) {
    keybindingsToAdd.push({
      command: getPromptCommandId(promptName),
      key: keybinding as string,
    });
  }

  const variableKeybindings = getAllVariableKeybindings();
  for (const [variableName, keybinding] of Object.entries(variableKeybindings)) {
    keybindingsToAdd.push({
      command: getVariableCommandId(variableName),
      key: keybinding as string,
    });
  }

  const taskKeybindings = getAllTaskKeybindings();
  for (const [taskName, keybinding] of Object.entries(taskKeybindings)) {
    keybindingsToAdd.push({
      command: getTaskCommandId(taskName),
      key: keybinding as string,
    });
  }

  if (keybindingsToAdd.length === 0) return;

  const keybindingsPath = getVSCodeKeybindingsPath();
  const existingKeybindings = loadKeybindings();

  const commandsToUpdate = new Set(keybindingsToAdd.map((k) => k.command));
  const filtered = existingKeybindings.filter((k) => !commandsToUpdate.has(k.command));
  const updated = [...filtered, ...keybindingsToAdd];

  try {
    fs.writeFileSync(keybindingsPath, JSON.stringify(updated, null, 2), 'utf8');
  } catch {
    // Silent fail
  }
}

export async function openKeybindingsForCommand(commandId: string) {
  await executeCommand(Command.VscodeOpenGlobalKeybindings, { query: `@command:${commandId}` });
}

export async function openKeybindingsWithPrefix(prefix: string) {
  await executeCommand(Command.VscodeOpenGlobalKeybindings, { query: prefix });
}
