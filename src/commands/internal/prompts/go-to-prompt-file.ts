import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { TreePrompt } from '../../../views/prompts';

export type GoToPromptFileParams = TreePrompt;

async function handleGoToPromptFile(item: GoToPromptFileParams) {
  if (item?.promptFile) {
    const uri = VscodeHelper.createFileUri(item.promptFile);
    await VscodeHelper.openDocument(uri);
  }
}

export function createGoToPromptFileCommand(): Disposable {
  return registerCommand(Command.GoToPromptFile, handleGoToPromptFile);
}
