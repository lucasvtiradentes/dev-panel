import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { TreePrompt } from '../../../views/prompts';

export type GoToPromptFileParams = TreePrompt;

export function createGoToPromptFileCommand(): Disposable {
  return registerCommand(Command.GoToPromptFile, async (item: GoToPromptFileParams) => {
    if (item?.promptFile) {
      const uri = VscodeHelper.createFileUri(item.promptFile);
      await VscodeHelper.openDocument(uri);
    }
  });
}
