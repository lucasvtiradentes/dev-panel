import * as fs from 'node:fs';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  getPromptCommandId,
  getReplacementCommandId,
  getTaskCommandId,
  getToolCommandId,
  getVariableCommandId,
} from '../common';
import { getAllPromptKeybindings } from '../views/prompts/keybindings-local';
import { getAllReplacementKeybindings } from '../views/replacements/keybindings-local';
import { getAllTaskKeybindings } from '../views/tasks/keybindings-local';
import { getAllKeybindings } from '../views/tools/keybindings-local';
import { getAllVariableKeybindings } from '../views/variables/keybindings-local';
import { getVSCodeKeybindingsPath } from './vscode-keybindings-utils';

export function syncKeybindings(): void {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders || folders.length === 0) return;

  const keybindingsToAdd: Array<{ command: string; key: string }> = [];

  const toolKeybindings = getAllKeybindings();
  for (const [toolName, keybinding] of Object.entries(toolKeybindings)) {
    keybindingsToAdd.push({
      command: getToolCommandId(toolName),
      key: keybinding,
    });
  }

  const promptKeybindings = getAllPromptKeybindings();
  for (const [promptName, keybinding] of Object.entries(promptKeybindings)) {
    keybindingsToAdd.push({
      command: getPromptCommandId(promptName),
      key: keybinding,
    });
  }

  const replacementKeybindings = getAllReplacementKeybindings();
  for (const [replacementName, keybinding] of Object.entries(replacementKeybindings)) {
    keybindingsToAdd.push({
      command: getReplacementCommandId(replacementName),
      key: keybinding,
    });
  }

  const variableKeybindings = getAllVariableKeybindings();
  for (const [variableName, keybinding] of Object.entries(variableKeybindings)) {
    keybindingsToAdd.push({
      command: getVariableCommandId(variableName),
      key: keybinding,
    });
  }

  const taskKeybindings = getAllTaskKeybindings();
  for (const [taskName, keybinding] of Object.entries(taskKeybindings)) {
    keybindingsToAdd.push({
      command: getTaskCommandId(taskName),
      key: keybinding,
    });
  }

  if (keybindingsToAdd.length === 0) return;

  const keybindingsPath = getVSCodeKeybindingsPath();
  let existingKeybindings: Array<{ command: string; key: string }> = [];

  if (fs.existsSync(keybindingsPath)) {
    try {
      const content = fs.readFileSync(keybindingsPath, 'utf8');
      existingKeybindings = content.trim() ? JSON5.parse(content) : [];
    } catch {
      existingKeybindings = [];
    }
  }

  const commandsToUpdate = new Set(keybindingsToAdd.map((k) => k.command));
  const filtered = existingKeybindings.filter((k) => !commandsToUpdate.has(k.command));
  const updated = [...filtered, ...keybindingsToAdd];

  try {
    fs.writeFileSync(keybindingsPath, JSON.stringify(updated, null, 2), 'utf8');
  } catch {
    // Silent fail
  }
}
