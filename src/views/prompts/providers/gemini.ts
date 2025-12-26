import type { Terminal } from '../../../common/vscode/vscode-types';
import type { PromptProvider } from './types';

export const geminiProvider: PromptProvider = {
  name: 'Gemini',
  executeInteractive: (terminal: Terminal, promptContent: string) => {
    const escapedPrompt = promptContent.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    terminal.sendText(`gemini "${escapedPrompt}"`);
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    return `gemini < "${tempFile}" > "${outputFile}"`;
  },
};
