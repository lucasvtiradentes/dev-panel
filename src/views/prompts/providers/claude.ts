import type { Terminal } from '../../../common/vscode/vscode-types';
import type { PromptProvider } from './types';

export const claudeProvider: PromptProvider = {
  name: 'Claude',
  executeInteractive: (terminal: Terminal, promptContent: string) => {
    const escapedPrompt = promptContent.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    terminal.sendText(`claude "${escapedPrompt}"`);
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    return `claude --print < "${tempFile}" > "${outputFile}"`;
  },
};
