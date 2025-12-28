import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { PromptTreeDataProvider } from '../../../views/prompts';

export function createRefreshPromptsCommand(promptTreeDataProvider: PromptTreeDataProvider) {
  return registerCommand(Command.RefreshPrompts, () => promptTreeDataProvider.refresh());
}
