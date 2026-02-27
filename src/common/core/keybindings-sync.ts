import { getAllPromptKeybindings } from '../../views/prompts/keybindings-local';
import { getAllTaskKeybindings } from '../../views/tasks/keybindings-local';
import { getAllVariableKeybindings } from '../../views/variables/keybindings-local';
import { getPromptCommandId, getTaskCommandId, getVariableCommandId } from '../constants/functions';
import { KeybindingsHelper } from '../utils/helpers/keybindings-helper';
import { Command, executeCommand } from '../vscode/vscode-commands';
import { VscodeHelper } from '../vscode/vscode-helper';
import { getVSCodeKeybindingsPath } from '../vscode/vscode-keybindings-utils';

export function syncKeybindings() {
  const keybindingsToAdd: Array<{ command: string; key: string }> = [];

  const folders = VscodeHelper.getWorkspaceFolders();
  if (folders.length > 0) {
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
  }

  const keybindingsPath = getVSCodeKeybindingsPath();
  const existingKeybindings = KeybindingsHelper.load(keybindingsPath);

  const deprecatedToolPrefixes = ['devPanel.tool.', 'devPaneldev.tool.'];
  const commandsToUpdate = new Set(keybindingsToAdd.map((k) => k.command));
  const filtered = existingKeybindings.filter(
    (k) =>
      typeof k.command !== 'string' ||
      (!commandsToUpdate.has(k.command) && !deprecatedToolPrefixes.some((prefix) => k.command.startsWith(prefix))),
  );
  const updated = [...filtered, ...keybindingsToAdd];

  if (JSON.stringify(updated) === JSON.stringify(existingKeybindings)) return;

  try {
    KeybindingsHelper.save(keybindingsPath, updated);
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
