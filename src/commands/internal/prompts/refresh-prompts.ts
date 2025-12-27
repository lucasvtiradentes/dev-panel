import { Command, registerCommand } from '../../../common/vscode/vscode-utils';
import type { PromptTreeDataProvider } from '../../../views/prompts';

export function createRefreshPromptsCommand(promptTreeDataProvider: PromptTreeDataProvider) {
  return registerCommand(Command.RefreshPrompts, () => promptTreeDataProvider.refresh());
}
