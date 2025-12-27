import { VscodeHelper } from '../vscode/vscode-helper';

export async function openKeybindingsForCommand(commandId: string) {
  await VscodeHelper.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}`);
}

export async function openKeybindingsWithPrefix(prefix: string) {
  await VscodeHelper.executeCommand('workbench.action.openGlobalKeybindings', prefix);
}
