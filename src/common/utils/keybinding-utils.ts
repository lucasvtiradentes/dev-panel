import * as vscode from 'vscode';

export async function openKeybindingsForCommand(commandId: string) {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}`);
}

export async function openKeybindingsWithPrefix(prefix: string) {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', prefix);
}
