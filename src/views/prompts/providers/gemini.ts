import type * as vscode from 'vscode';
import type { PromptProvider } from './types';

export const geminiProvider: PromptProvider = {
  name: 'Gemini',
  executeInteractive: (terminal: vscode.Terminal, promptContent: string) => {
    const escapedPrompt = promptContent.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    terminal.sendText(`gemini "${escapedPrompt}"`);
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    return `gemini < "${tempFile}" > "${outputFile}"`;
  },
};
