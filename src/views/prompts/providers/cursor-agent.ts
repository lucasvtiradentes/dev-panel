import type * as vscode from 'vscode';
import type { PromptProvider } from './types';

export const cursorAgentProvider: PromptProvider = {
  name: 'Cursor Agent',
  executeInteractive: (terminal: vscode.Terminal, promptContent: string) => {
    const escapedPrompt = promptContent.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    terminal.sendText(`cursor-agent "${escapedPrompt}"`);
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    return `cursor-agent < "${tempFile}" > "${outputFile}"`;
  },
};
