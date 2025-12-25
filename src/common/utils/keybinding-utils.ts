import * as vscode from 'vscode';

export async function openKeybindingsForCommand(commandId: string): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}`);
}

export async function openKeybindingsWithPrefix(prefix: string): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', prefix);
}
