import { Command, executeCommand } from '../lib/vscode-utils';

export async function openKeybindingsForCommand(commandId: string) {
  await executeCommand(Command.VscodeOpenGlobalKeybindings, { query: `@command:${commandId}` });
}

export async function openKeybindingsWithPrefix(prefix: string) {
  await executeCommand(Command.VscodeOpenGlobalKeybindings, { query: prefix });
}
