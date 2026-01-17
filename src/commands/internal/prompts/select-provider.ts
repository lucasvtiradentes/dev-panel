import { AIProvider } from '../../../common/schemas/config-schema';
import { promptsState } from '../../../common/state';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { PromptTreeDataProvider } from '../../../views/prompts';

export function createSelectProviderCommand(provider: PromptTreeDataProvider) {
  return registerCommand(Command.PromptsSelectProvider, async () => {
    const options = Object.values(AIProvider);
    const selected = await VscodeHelper.showQuickPick(options, { placeHolder: 'Select AI Provider' });
    if (selected) {
      promptsState.saveAiProvider(selected as AIProvider);
      provider.updateDescription();
    }
  });
}
