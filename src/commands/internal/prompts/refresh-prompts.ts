import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { PromptTreeDataProvider } from '../../../views/prompts';

export function createRefreshPromptsCommand(promptTreeDataProvider: PromptTreeDataProvider) {
  return registerCommand(Command.RefreshPrompts, () => promptTreeDataProvider.refresh());
}
