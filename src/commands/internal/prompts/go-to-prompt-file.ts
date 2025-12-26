import * as vscode from 'vscode';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { TreePrompt } from '../../../views/prompts';

export type GoToPromptFileParams = TreePrompt;

export function createGoToPromptFileCommand(): Disposable {
  return registerCommand(Command.GoToPromptFile, async (item: GoToPromptFileParams) => {
    if (item?.promptFile) {
      const uri = vscode.Uri.file(item.promptFile);
      await vscode.window.showTextDocument(uri);
    }
  });
}
